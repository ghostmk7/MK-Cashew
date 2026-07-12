const url = "https://script.google.com/macros/s/AKfycbxkwVEtFK6CrZg5t2CvbJzOlUPG0xte7PXxKlnEmyGyIVUc0MiRXhh0Wk7YPqlzC8mh/exec";

fetch(url)
  .then(res => res.text())
  .then(text => console.log("GET Response:", text))
  .catch(console.error);
