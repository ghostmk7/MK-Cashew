const url = "https://script.google.com/macros/s/AKfycbxkwVEtFK6CrZg5t2CvbJzOlUPG0xte7PXxKlnEmyGyIVUc0MiRXhh0Wk7YPqlzC8mh/exec";
const data = { "test": "hello from node" };

fetch(url, {
  method: "POST",
  body: JSON.stringify(data) // don't use no-cors in node
}).then(async res => {
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}).catch(console.error);
