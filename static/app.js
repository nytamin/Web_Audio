let audioCtx = new AudioContext();
let audioBuffer = null;
let source = null;
let gainNode = audioCtx.createGain();

let splitter = null;

let analysers = [];
let meterElements = [];

gainNode.connect(audioCtx.destination);

//audioCtx.destination.channelCountMode = "max";

const channelLabels = [
    "FL",
    "FR",
    "FC",
    "LFE",
    "SL",
    "SR",
    "BL",
    "BR"
];

const infoPanel = document.getElementById("info");
const routingPanel = document.getElementById("routing");

document.getElementById("loadBtn").onclick = loadAudio;
document.getElementById("playBtn").onclick = playAudio;
document.getElementById("loadBtnVid").onclick = loadMedia;
document.getElementById("playBtnVid").onclick = playMedia;

async function loadAudio() {
    if (source) source.stop();
    const file = document.getElementById("fileSelect").value;
    const response = await fetch(file);
    const arrayBuffer = await response.arrayBuffer();

    try {
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        console.log(typeof audioBuffer);
    } catch (error) {
    console.error(error);
        displayError(error);
        return;
    }
    displayInfo(audioBuffer);
    displayRouting(audioBuffer);
    setupAnalysis(audioBuffer.numberOfChannels);
    console.log("TYPE: ",Object.prototype.toString.call(audioBuffer).slice(8, -1).toLowerCase())
}

function playAudio() {
    if (!audioBuffer) return;
    source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    const splitter = audioCtx.createChannelSplitter(audioBuffer.numberOfChannels);
    source.connect(splitter);
    source.connect(gainNode);
    source.start();
    console.log("TYPE: ",Object.prototype.toString.call(source).slice(8, -1).toLowerCase())
}

let mediaSource = null;

function loadMedia() {
    const file = document.getElementById("fileSelectVid").value;
    const video = document.getElementById("videoPlayer");
    video.src = file;
    video.onloadedmetadata = () => {
        displayMediaInfo(video);
        const assumedChannels = 8;
        setupAnalysis(assumedChannels);
        displayMediaRouting(assumedChannels);
    };
    if (!mediaSource) {
        mediaSource = audioCtx.createMediaElementSource(video);
        mediaSource.connect(gainNode);
        console.log("TYPE: ",Object.prototype.toString.call(mediaSource).slice(8, -1).toLowerCase())
    }
}

async function playMedia() {
    console.log("PLAY MEDIA")
    await audioCtx.resume();
    const video = document.getElementById("videoPlayer");
    video.play();
}

function setupAnalysis(channelCount) {
    // sets up metering
    if (splitter) splitter.disconnect();

    splitter = audioCtx.createChannelSplitter(channelCount);
    gainNode.connect(splitter);
    analysers = [];
    meterElements = [];
    const metersDiv = document.getElementById("meters");
    metersDiv.innerHTML = "";

    for (let i = 0; i < channelCount; i++) {
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        splitter.connect(analyser, i);
        analysers.push(analyser);
        const label = channelLabels[i] || ("CH" + i);
        const meterWrapper = document.createElement("div");
        meterWrapper.className = "meter";
        const meterFill = document.createElement("div");
        meterFill.className = "meter-fill";
        const meterLabel = document.createElement("div");
        meterLabel.className = "meter-label";
        meterLabel.textContent = label;
        meterWrapper.appendChild(meterFill);
        metersDiv.appendChild(meterLabel);
        metersDiv.appendChild(meterWrapper);
        meterElements.push(meterFill);
    }
    drawMeters();
}

function drawMeters() {
    for (let i = 0; i < analysers.length; i++) {
        const data = new Uint8Array(analysers[i].frequencyBinCount);
        analysers[i].getByteFrequencyData(data);
        let sum = 0;
        for (let j = 0; j < data.length; j++) {
            sum += data[j];
        }
        const avg = sum / data.length;
        const level = avg / 255 * 100;
        meterElements[i].style.width = level + "%";
    }
    requestAnimationFrame(drawMeters);
}

function displayInfo(buffer) {
    const info = {
        channels: buffer.numberOfChannels,
        sampleRate: buffer.sampleRate,
        duration: buffer.duration.toFixed(2) + " sec",
        length_samples: buffer.length
    };
    infoPanel.textContent = JSON.stringify(info, null, 2);
}

function displayError(error) {
    infoPanel.textContent = error;
    routingPanel.textContent = '* * * * *';
}

function displayRouting(buffer) {
    let diagram = "";
    diagram += "AudioBufferSourceNode\n";
    diagram += "(Source Channels: " + buffer.numberOfChannels + ")" + "\n";
    diagram += "        │\n";
    diagram += "        ▼\n";
    diagram += "     GainNode\n";
    diagram += "        │\n";
    diagram += "        ▼\n";
    diagram += "AudioDestinationNode\n\n";
    diagram += "        │\n";
    diagram += "        ▼\n";
    diagram += "Destination Channels: " + audioCtx.destination.maxChannelCount + "\n";
    diagram += "Mode: " + audioCtx.destination.channelCountMode;

    routingPanel.textContent = diagram;
}

function displayMediaInfo(video) {
    const info = {
        source: "MediaElement",
        duration: video.duration.toFixed(2) + " sec",
        width: video.videoWidth,
        height: video.videoHeight,
        readyState: video.readyState,
        networkState: video.networkState
    };
    infoPanel.textContent = JSON.stringify(info, null, 2);
}

function displayMediaRouting(channelCount) {
    // assumes 8 channels
    let diagram = "";
    diagram += "HTMLMediaElement (video/audio)\n";
    diagram += "        │\n";
    diagram += "        ▼\n";
    diagram += "MediaElementAudioSourceNode\n";
    diagram += "        │\n";
    diagram += "        ▼\n";
    diagram += "GainNode\n";
    diagram += "        │\n";
    diagram += "        ▼\n";
    diagram += "ChannelSplitterNode\n";
    diagram += "(Assumed Channels: " + channelCount + ")\n";
    diagram += "        │\n";
    diagram += "        ▼\n";
    diagram += "AudioDestinationNode\n";
    routingPanel.textContent = diagram;
}