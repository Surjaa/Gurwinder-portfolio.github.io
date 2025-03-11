document.addEventListener("DOMContentLoaded", () => {
  const containers = document.querySelectorAll(".container");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        } else {
          entry.target.classList.remove("is-visible");
        }
      });
    },
    { threshold: 0.1 }
  );
  containers.forEach((container) => observer.observe(container));
});

const titles = ["Technical Content Writer", "IT Intern"];
let titleIndex = 0;
let charIndex = 0;
const textElement = document.getElementById("animated-text");

function typeEffect() {
  if (charIndex < titles[titleIndex].length) {
    textElement.innerHTML += titles[titleIndex].charAt(charIndex);
    charIndex++;
    setTimeout(typeEffect, 100);
  } else {
    setTimeout(eraseEffect, 2000);
  }
}

function eraseEffect() {
  if (charIndex > 0) {
    textElement.innerHTML = titles[titleIndex].substring(0, charIndex - 1);
    charIndex--;
    setTimeout(eraseEffect, 50);
  } else {
    titleIndex = (titleIndex + 1) % titles.length;
    setTimeout(typeEffect, 500);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(typeEffect, 500);
});

// Initialize EmailJS with your Public Key
emailjs.init("hjDYho1Zz-aNreUSw"); // Replace with your Public Key

document
  .getElementById("contact-form")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent default form submission

    emailjs.sendForm("service_0iczgm3", "template_5uucrae", this).then(
      function (response) {
        console.log("Success!", response.status, response.text);
        document.getElementById("contact-form").reset(); // Reset the form after submission
      },
      function (error) {
        console.log("Failed", error);
        document.getElementById("status-message").innerHTML =
          "<span style='color: red;'>Message Failed. Try Again.</span>";
      }
    );
  });

document
  .getElementById("contact-form")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent default submission

    setTimeout(() => {
      alert("Thank you for your feedback. I'll be in touch shortly!");
      document.getElementById("contact-form").reset(); // Reset form
    }, 1000);
  });
