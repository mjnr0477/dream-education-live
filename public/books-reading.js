(function () {
  "use strict";
  function escapeBooksHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  window.renderBooksReading = function renderBooksReading() {
    const authorBooks = [
      { title: "Featured book by Mathias Simiyu", description: "Start with the author's Books2Read universal link to see the book and the stores where it is available.", label: "Find a bookstore", url: "https://books2read.com/u/3Leqq0", featured: true },
      { title: "Fulfill Your Purpose", description: "A reflective book about purpose, identity, alignment and personal growth.", label: "View on Kobo", url: "https://www.kobo.com/us/en/ebook/fulfill-your-purpose" },
      { title: "Beyond Labels", description: "A guide to moving beyond guilt, fear, identity and social expectations.", label: "View book", url: "https://bookshop.org/p/books/beyond-labels-mathias-simiyu/91a76b72c9936aee" },
      { title: "Stay Awake", description: "A reflective work about seeing the world clearly and questioning the masks people wear.", label: "View book", url: "https://bookshop.org/p/books/stay-awake-mathias-simiyu/d26bdc3462496def" },
      { title: "Fast, Easy, Simple and First Million Dollars", description: "A book about mindset, opportunity, creating value and taking practical steps toward financial growth.", label: "View on The Nile", url: "https://www.thenile.com.au/books/mathias-simiyu/fast-easy-simple-and-first-million-dollars/9798233964442" },
      { title: "Football", description: "A short reflection on patience, composure, decisiveness and the mindset of the game.", label: "View on Barnes & Noble", url: "https://www.barnesandnoble.com/w/football-mathias-simiyu/1148226348" },
      { title: "Last Book", description: "A paperback title by Mathias Simiyu listed by Foyles.", label: "View on Foyles", url: "https://www.foyles.co.uk/book/last-book/mathias-simiyu/9798235950887" }
    ];
    const moreReading = [
      { title: "OpenStax", description: "Free, openly licensed textbooks for many school and college subjects.", label: "Browse free textbooks", url: "https://openstax.org/subjects" },
      { title: "Project Gutenberg", description: "A large collection of public-domain ebooks to read online or download.", label: "Browse free ebooks", url: "https://www.gutenberg.org/" }
    ];
    function card(book) {
      return '<article class="books-reading-card' + (book.featured ? ' is-featured' : '') + '">' +
        '<div class="books-reading-card-mark" aria-hidden="true"><span>BOOK</span></div>' +
        '<div class="books-reading-card-copy"><h3>' + escapeBooksHTML(book.title) + '</h3>' +
        '<p>' + escapeBooksHTML(book.description) + '</p>' +
        '<a class="books-reading-link" href="' + escapeBooksHTML(book.url) + '" target="_blank" rel="noopener noreferrer">' +
        escapeBooksHTML(book.label) + ' <span aria-hidden="true">↗</span></a></div></article>';
    }
    return '<div class="books-reading-workspace">' +
      '<section class="books-reading-intro"><span class="books-reading-eyebrow">AUTHOR SPOTLIGHT</span>' +
      '<h2>Books by Mathias Simiyu</h2>' +
      '<p>Explore reflective writing on purpose, identity, personal growth, money and the mindset of football. Book links open the relevant bookstore in a new tab.</p>' +
      '<a class="books-reading-primary" href="https://books2read.com/u/3Leqq0" target="_blank" rel="noopener noreferrer">Browse the featured book on Books2Read <span aria-hidden="true">↗</span></a>' +
      '</section><section class="books-reading-section" aria-labelledby="books-reading-author-heading">' +
      '<div class="books-reading-section-heading"><span class="books-reading-eyebrow">AUTHOR COLLECTION</span><h2 id="books-reading-author-heading">Explore the books</h2>' +
      '<p>Store availability, formats and prices are controlled by each bookstore and may vary by country.</p></div>' +
      '<div class="books-reading-grid">' + authorBooks.map(card).join("") + '</div></section>' +
      '<section class="books-reading-section books-reading-more" aria-labelledby="books-reading-more-heading">' +
      '<div class="books-reading-section-heading"><span class="books-reading-eyebrow">MORE TO EXPLORE</span><h2 id="books-reading-more-heading">Free learning and reading</h2>' +
      '<p>Discover additional reading beyond the author collection.</p></div>' +
      '<div class="books-reading-grid">' + moreReading.map(card).join("") + '</div></section>' +
      '<p class="books-reading-note">Dream Education links to external book and reading websites. Purchases, availability, pricing and terms are handled by those providers.</p></div>';
  };
})();
