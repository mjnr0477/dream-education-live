'use strict';
const assert=require('assert');
const {createUniversalMessage,resolveRecipient,resolveDelivery,deliverMessage}=require('../product/connect_messenger_engine');
const {buildNativeMessengerConnectors,getDreamInboxMessages}=require('../product/native_messenger_connectors');
const message=createUniversalMessage({body:'Hello exact recipient',recipient:{type:'person',name:'Amina Otieno',platform:'email'}});
assert.ok(message.message_id.startsWith('msg_'));
const resolved=resolveRecipient(message.recipient,[{name:'Wrong Person',platform:'email'},{name:'Amina Otieno',platform:'email',email:'amina@example.com'}]);
assert.strictEqual(resolved.resolved,true);
assert.strictEqual(resolved.selected.email,'amina@example.com');
(async()=>{
 const connectors=[{id:'email-1',name:'Email',recipients:[{name:'Amina Otieno',platform:'email',email:'amina@example.com'}],channels:[{type:'email',platform:'email',authorized:true,enabled:true,send:async()=>({success:true,message_id:'provider-1'})}]}];
 const plan=await resolveDelivery(message.recipient,connectors);
 assert.strictEqual(plan.delivery_ready,true);
 const sent=await deliverMessage(message,connectors);
 assert.strictEqual(sent.success,true);
 assert.strictEqual(sent.status,'delivered');

 const defaultConnectors=buildNativeMessengerConnectors({});
 const defaultMessage=createUniversalMessage({body:'Guaranteed Dream inbox delivery'});
 const defaultPlan=await resolveDelivery(defaultMessage.recipient,defaultConnectors);
 assert.strictEqual(defaultPlan.delivery_ready,true);
 assert.strictEqual(defaultPlan.default_destination,true);
 const defaultSent=await deliverMessage(defaultMessage,defaultConnectors);
 assert.strictEqual(defaultSent.success,true);
 assert.strictEqual(defaultSent.status,'delivered');
 assert.strictEqual(defaultSent.channel.platform,'dream_inbox');
 assert.ok(getDreamInboxMessages(10).some(item=>item.message_id===defaultMessage.message_id));

 const fanoutMessage=createUniversalMessage({body:'Automatic fan-out verification',recipient:{}});
 let fanoutCalls=0;
 const fanoutConnectors=[
   {id:'one',name:'One',channels:[{type:'broadcast',platform:'one',authorized:true,enabled:true,broadcast:true,send:async()=>{fanoutCalls++;return {success:true,status:200}}}]},
   {id:'two',name:'Two',channels:[{type:'broadcast',platform:'two',authorized:true,enabled:true,broadcast:true,send:async()=>{fanoutCalls++;return {success:true,status:200}}}]}
 ];
 const fanout=await deliverMessage(fanoutMessage,fanoutConnectors);
 assert.strictEqual(fanout.success,true);
 assert.strictEqual(fanout.status,'delivered_everywhere_configured');
 assert.strictEqual(fanout.attempted,2);
 assert.strictEqual(fanout.delivered,2);
 assert.strictEqual(fanout.failed,0);
 assert.strictEqual(fanoutCalls,2);

 const unknownExternal=await deliverMessage(
   createUniversalMessage({body:'Do not redirect me',recipient:{platform:'email',email:'unknown@example.com'}}),
   buildNativeMessengerConnectors({})
 );
 assert.strictEqual(unknownExternal.success,false);
 assert.strictEqual(unknownExternal.status,'no_authorized_channel');
 const blocked=await deliverMessage(message,[{id:'x',recipients:[{name:'Amina Otieno',platform:'email'}],channels:[{type:'email',platform:'email',authorized:false,enabled:true,send:async()=>({success:true})}]}]);
 assert.strictEqual(blocked.success,false);
 assert.strictEqual(blocked.status,'no_authorized_channel');
 console.log('CONNECT UNIVERSAL MESSENGER SMOKE TEST: PASS');
})().catch(e=>{console.error(e);process.exit(1)});
