function launchApp(appUrl) {
    // Add a smooth fade-out effect before navigation
    document.body.style.transition = 'opacity 0.3s ease';
    document.body.style.opacity = '0';
    
    setTimeout(() => {
        window.location.href = appUrl;
    }, 300);
}

// Create floating particles effect
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random size between 2px and 8px
        const size = Math.random() * 6 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        // Random horizontal position
        particle.style.left = Math.random() * 100 + '%';
        
        // Random animation delay
        particle.style.animationDelay = Math.random() * 15 + 's';
        
        // Random animation duration
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        
        particlesContainer.appendChild(particle);
    }
}

// Initialize particles when page loads
document.addEventListener('DOMContentLoaded', createParticles);

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey) {
        switch(e.key) {
            case '1':
                e.preventDefault();
                launchApp('maintyping.html');
                break;
            case '2':
                e.preventDefault();
                launchApp('maintts.html');
                break;
            case '3':
                e.preventDefault();
                launchApp('mainflashcard.html');
                break;
        }
    }
});

// Add smooth scrolling for any anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add loading states for better UX
document.querySelectorAll('.app-card').forEach(card => {
    card.addEventListener('click', function() {
        const btn = this.querySelector('.launch-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Loading...';
        btn.style.opacity = '0.7';
        
        // Reset if navigation doesn't happen (for some reason)
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.opacity = '1';
        }, 5000);
    });
});