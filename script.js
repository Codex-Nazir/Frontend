document.getElementById("contact-form").addEventListener("submit", function(e) {
    e.preventDefault();

    emailjs.send("service_9lb63gg", "template_5qsmhph", {
        from_name: document.querySelector("input[type='text']").value,
        from_email: document.querySelector("input[type='email']").value,
        message: document.querySelector("textarea").value
    })
    .then(function() {
        alert("Message sent successfully!");
        document.getElementById("contact-form").reset();
    }, function(error) {
        alert("Failed to send message");
        console.log(error);
    });
});