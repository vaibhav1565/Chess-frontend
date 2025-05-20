let interval;

let remainingTime;
let previousTimestamp;

let tickRate;
// let increment;

function startTimer() {
    clearInterval(interval);
    previousTimestamp = Date.now(); // Record the start time

    interval = setInterval(() => {
        const currentTime = Date.now();
        const elapsed = currentTime - previousTimestamp; // Calculate actual elapsed time
        previousTimestamp = currentTime;

        remainingTime = Math.max(0, remainingTime - elapsed);
        postMessage({ type: "tick", remainingTime });
        // console.log("tick", remainingTime);

        if (remainingTime === 0) clearInterval(interval);
    }, tickRate);
}

onmessage = (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case "init": {
            console.log('Initializing timer');
            // increment = payload.increment;
            remainingTime = payload.totalTime;
            tickRate = payload.tickRate;
            break;
        }

        case "initAndStart": {
            console.log('Initializing and starting timer');
            // increment = payload.increment;
            remainingTime = payload.totalTime;
            tickRate = payload.tickRate;
            startTimer();
            break;  
        }

        case "stop": {
            console.log('Stopping timer', {
                currentTime: remainingTime
            });
            clearInterval(interval);
            break;
        }

        case "start": {
            console.log('Starting timer from current state', {
                remainingTime,
                tickRate
            });
            startTimer();
            break;
        }

        default: {
            console.log('Unknown message type received', { type });
        }

        // case "addIncrement": {
        //     remainingTime += increment;
        //     break;
        // }
    }
};

// workers cannot import es module