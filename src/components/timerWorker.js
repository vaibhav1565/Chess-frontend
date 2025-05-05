let interval = null;
let time = 0;
let lastTime = 0;

onmessage = (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case "start": {
            time = payload.timeLeft;
            const tickRate = payload.tickRate;

            clearInterval(interval);
            lastTime = Date.now(); // Record the start time

            interval = setInterval(() => {
                const currentTime = Date.now();
                const elapsed = currentTime - lastTime; // Calculate actual elapsed time
                lastTime = currentTime;

                time = Math.max(0, time - elapsed); // Subtract actual elapsed time
                postMessage({ type: "tick", time });
                console.log("tick", time);

                if (time <= 0) clearInterval(interval);
            }, tickRate);
            break;
        }

        case "stop":
            clearInterval(interval);
            break;

        case "reset":
            clearInterval(interval);
            time = 0;
            postMessage({ type: "tick", time });
            break;
    }
};