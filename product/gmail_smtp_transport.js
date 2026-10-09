'use strict';

const tls = require('tls');

function readSmtpResponse(reader) {
  return new Promise((resolve, reject) => {
    const lines = [];
    const consume = (line) => {
      lines.push(line);
      if (/^\d{3} /.test(line)) {
        const code = Number(line.slice(0, 3));
        resolve({ code, text: lines.join('\n') });
      } else {
        reader.next(consume, reject);
      }
    };
    reader.next(consume, reject);
  });
}

function createLineReader(socket) {
  let buffer = '';
  const lines = [];
  const waiters = [];
  let failure = null;

  function flush() {
    while (lines.length && waiters.length) {
      const waiter = waiters.shift();
      waiter.resolve(lines.shift());
    }
    if (failure) {
      while (waiters.length) waiters.shift().reject(failure);
    }
  }

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let index;
    while ((index = buffer.indexOf('\r\n')) !== -1) {
      lines.push(buffer.slice(0, index));
      buffer = buffer.slice(index + 2);
    }
    flush();
  });
  socket.on('error', (error) => {
    failure = error;
    flush();
  });
  socket.on('close', () => {
    if (!failure) failure = new Error('Gmail SMTP connection closed unexpectedly.');
    flush();
  });

  return {
    next(resolve, reject) {
      if (lines.length) resolve(lines.shift());
      else if (failure) reject(failure);
      else waiters.push({ resolve, reject });
    }
  };
}

async function sendGmailSmtpEmail({ user, appPassword, to, subject, text, connect = tls.connect }) {
  const sender = String(user || '').trim();
  const recipient = String(to || '').trim();
  const password = String(appPassword || '').replace(/\s+/g, '');
  if (!/^[^\s@]+@gmail\.com$/i.test(sender)) throw new Error('GMAIL_USER must be a Gmail address.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error('A valid email recipient is required.');
  if (!password) throw new Error('GMAIL_APP_PASSWORD is missing.');

  const socket = connect({ host: 'smtp.gmail.com', port: 465, servername: 'smtp.gmail.com' });
  socket.setTimeout(20000, () => socket.destroy(new Error('Gmail SMTP timed out.')));
  const reader = createLineReader(socket);
  const expect = async (codes, command) => {
    if (command) socket.write(command + '\r\n');
    const response = await readSmtpResponse(reader);
    if (!codes.includes(response.code)) {
      throw new Error('Gmail SMTP rejected a command (' + response.code + '): ' + response.text.slice(0, 500));
    }
    return response;
  };

  try {
    await new Promise((resolve, reject) => {
      socket.once('secureConnect', resolve);
      socket.once('error', reject);
    });
    await expect([220]);
    await expect([250], 'EHLO dream-education.local');
    await expect([334], 'AUTH LOGIN');
    await expect([334], Buffer.from(sender).toString('base64'));
    await expect([235], Buffer.from(password).toString('base64'));
    await expect([250], 'MAIL FROM:<' + sender + '>');
    await expect([250, 251], 'RCPT TO:<' + recipient + '>');
    await expect([354], 'DATA');

    const safeSubject = String(subject || 'Message from Dream Education').replace(/[\r\n]/g, ' ').slice(0, 200);
    const encodedSubject = '=?UTF-8?B?' + Buffer.from(safeSubject, 'utf8').toString('base64') + '?=';
    const bodyBase64 = Buffer.from(String(text || ''), 'utf8').toString('base64').match(/.{1,76}/g);
    const message = [
      'From: Dream Education <' + sender + '>',
      'To: ' + recipient,
      'Subject: ' + encodedSubject,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      (bodyBase64 || ['']).join('\r\n'),
      '.'
    ].join('\r\n');
    socket.write(message + '\r\n');
    const accepted = await readSmtpResponse(reader);
    if (accepted.code !== 250) {
      throw new Error('Gmail SMTP did not accept the message (' + accepted.code + '): ' + accepted.text.slice(0, 500));
    }
    try { await expect([221], 'QUIT'); } catch { /* Message was accepted; QUIT failure does not undo acceptance. */ }
    return { success: true, status: 250, data: { accepted: true, provider: 'gmail-smtp', response: accepted.text } };
  } catch (error) {
    return { success: false, status: 502, data: { error: error.message || 'Gmail SMTP delivery failed.' } };
  } finally {
    socket.end();
    if (!socket.destroyed) socket.destroy();
  }
}

module.exports = { sendGmailSmtpEmail };
