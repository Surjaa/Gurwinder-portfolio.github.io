document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // CONTAINER SCROLL ANIMATION
  // ==========================================

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


  // ==========================================
  // ANIMATED JOB TITLE
  // ==========================================

  const titles = ["Technical Content Writer", "System Analyst"];
  let titleIndex = 0;
  let charIndex = 0;

  const textElement = document.getElementById("animated-text");

  function typeEffect() {
    if (!textElement) return;

    if (charIndex < titles[titleIndex].length) {
      textElement.innerHTML += titles[titleIndex].charAt(charIndex);
      charIndex++;

      setTimeout(typeEffect, 100);
    } else {
      setTimeout(eraseEffect, 2000);
    }
  }

  function eraseEffect() {
    if (!textElement) return;

    if (charIndex > 0) {
      textElement.innerHTML = titles[titleIndex].substring(
        0,
        charIndex - 1
      );

      charIndex--;

      setTimeout(eraseEffect, 50);
    } else {
      titleIndex = (titleIndex + 1) % titles.length;

      setTimeout(typeEffect, 500);
    }
  }

  setTimeout(typeEffect, 500);


  // ==========================================
  // EMAILJS CONTACT FORM
  // ==========================================

  // Initialize EmailJS
  emailjs.init("hjDYho1Zz-aNreUSw");

  const contactForm = document.getElementById("contact-form");
  const statusMessage = document.getElementById("status-message");

  if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();

      // Show sending message
      if (statusMessage) {
        statusMessage.innerHTML =
          "<span style='color: orange;'>Sending...</span>";
      }

      // Send form using EmailJS
      emailjs
        .sendForm(
          "service_3l7btav",
          "template_5uucrae",
          contactForm
        )
        .then(
          function (response) {
            console.log(
              "SUCCESS!",
              response.status,
              response.text
            );

            if (statusMessage) {
              statusMessage.innerHTML =
                "<span style='color: green;'>Message Sent Successfully!</span>";
            }

            // Clear form
            contactForm.reset();
          },

          function (error) {
            console.error("EMAILJS ERROR:", error);
            console.error("ERROR STATUS:", error.status);
            console.error("ERROR TEXT:", error.text);

            if (statusMessage) {
              statusMessage.innerHTML =
                "<span style='color: red;'>Message Failed. Try Again.</span>";
            }
          }
        );
    });
  }
});