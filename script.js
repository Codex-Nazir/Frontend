document.getElementById("contact-form").addEventListener("submit", function (e) {
    e.preventDefault();

    emailjs.send("service_9lb63gg", "template_5qsmhph", {
        from_name: document.querySelector("input[type='text']").value,
        from_email: document.querySelector("input[type='email']").value,
        message: document.querySelector("textarea").value
    })
        .then(function () {
            alert("Message sent successfully!");
            document.getElementById("contact-form").reset();
        }, function (error) {
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

    // Razorpay Options
    var options = {
        "key": "rzp_test_Sk0xRrM8HHUW1y", // Enter your Key ID here
        "amount": "900", // Amount is in currency subunits (900 paise = ₹9)
        "currency": "INR",
        "name": "NH TECHNO",
        "description": "Premium Linux Lab Access",
        "image": "https://yt3.googleusercontent.com/7GS-XD-yt4cfVAsr2MDYuMoZ5cDD32t_MNJBhJB4T2bZKs2t8oatnin2tYGd7hoZi-_d_p5-ZJY=s160-c-k-c0x00ffffff-no-rj",
        "handler": function (response) {
            // This code runs when payment is successful
            payBtn.disabled = true;
            payBtn.innerHTML = '<i class="fas fa-check-circle"></i> Payment Successful!';
            payBtn.style.background = '#22c55e';

            console.log("Payment ID:", response.razorpay_payment_id);

            setTimeout(() => {
                window.location.href = 'https://web-linux-lab.onrender.com/';
            }, 1500);
        },
        "prefill": {
            "name": "", // You can prefill user info here if available
            "email": "",
            "contact": ""
        },
        "theme": {
            "color": "#3b82f6"
        }
    };

    var rzp1 = new Razorpay(options);

    rzp1.on('payment.failed', function (response) {
        alert("Payment Failed: " + response.error.description);
    });

    rzp1.open();
}


// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('paymentModal');
    if (event.target == modal) {
        closePaymentModal();
    }
}
