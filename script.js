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

/* Linux Lab Payment Logic */
function openPaymentModal() {
    document.getElementById('paymentModal').style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function processPayment() {
    const payBtn = document.getElementById('payButton');
    const originalText = payBtn.innerText;
    
    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Simulate payment processing delay
    setTimeout(() => {
        payBtn.innerHTML = '<i class="fas fa-check-circle"></i> Payment Successful!';
        payBtn.style.background = '#22c55e';
        
        setTimeout(() => {
            // Redirect to the Render URL
            window.location.href = 'https://web-linux-lab.onrender.com/';
        }, 1500);
    }, 2500);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('paymentModal');
    if (event.target == modal) {
        closePaymentModal();
    }
}