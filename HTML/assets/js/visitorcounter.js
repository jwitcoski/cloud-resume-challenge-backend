const counter = document.querySelector(".counter-number");

async function updateCounter() {
    try {
        let response = await fetch("https://hmye7a6tg1.execute-api.us-east-1.amazonaws.com/beta");
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        let data = await response.json();
        const parsedBody = JSON.parse(data.body);
        counter.innerHTML = `PAGE VIEWS: ${parsedBody.Count}`;
    } catch (error) {
        console.error('Error fetching visitor count:', error);
        counter.innerHTML = 'Error loading visitor count';
    }
}

document.addEventListener("DOMContentLoaded", updateCounter);