(function () {
  "use strict";
  function escapeBooksHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  window.renderBooksReading = function renderBooksReading() {
    const featuredBooks = [
      {
        title: "Featured book",
        description: "Explore the book and choose a bookstore through the universal link.",
        label: "Find a bookstore",
        url: "https://books2read.com/u/3Leqq0",
        featured: true
      }
    ];
    const freeReading = [
      { title: "Pride and Prejudice", description: "Jane Austen's classic novel, available to read free from Project Gutenberg.", label: "Read free", url: "https://www.gutenberg.org/ebooks/1342" },
      { title: "The Adventures of Sherlock Holmes", description: "Arthur Conan Doyle's collection of detective stories, available free.", label: "Read free", url: "https://www.gutenberg.org/ebooks/1661" },
      { title: "Alice's Adventures in Wonderland", description: "Lewis Carroll's imaginative classic, available free.", label: "Read free", url: "https://www.gutenberg.org/ebooks/11" },
      { title: "OpenStax Textbooks", description: "Free, openly licensed textbooks for school and college subjects.", label: "Browse textbooks", url: "https://openstax.org/subjects" },
      { title: "Project Gutenberg", description: "Explore thousands of public-domain ebooks to read online or download.", label: "Browse free ebooks", url: "https://www.gutenberg.org/" }
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
      '<section class="books-reading-intro"><span class="books-reading-eyebrow">BOOK SPOTLIGHT</span>' +
      '<h2>Discover your next read</h2>' +
      '<p>Explore the featured book or choose from free classics and educational textbooks.</p>' +
      '<a class="books-reading-primary" href="https://books2read.com/u/3Leqq0" target="_blank" rel="noopener noreferrer">Explore featured book <span aria-hidden="true">↗</span></a>' +
      '</section><section class="books-reading-section" aria-labelledby="books-reading-featured-heading">' +
      '<div class="books-reading-section-heading"><span class="books-reading-eyebrow">FEATURED</span><h2 id="books-reading-featured-heading">Featured book</h2>' +
      '<p>Choose a bookstore from the universal link. Availability, formats and prices may vary by country.</p></div>' +
      '<div class="books-reading-grid">' + featuredBooks.map(card).join("") + '</div></section>' +
      '<section class="books-reading-section books-reading-more" aria-labelledby="books-reading-more-heading">' +
      '<div class="books-reading-section-heading"><span class="books-reading-eyebrow">MORE TO EXPLORE</span><h2 id="books-reading-more-heading">Free books and learning</h2>' +
      '<p>Read classic stories or find free textbooks for your studies.</p></div>' +
      '<div class="books-reading-grid">' + freeReading.map(card).join("") + '</div></section>' +
      '<p class="books-reading-note">Dream Education links to external book and reading websites. Purchases, availability, pricing and terms are handled by those providers.</p></div>';
  };
})();
