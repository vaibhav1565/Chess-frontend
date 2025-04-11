let interval = null;
let time = 0;

onmessage = (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case "start": {
            time = payload.timeLeft;
            const tickRate = payload.tickRate;

            clearInterval(interval);
            interval = setInterval(() => {
                time = Math.max(0, time - tickRate);
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
