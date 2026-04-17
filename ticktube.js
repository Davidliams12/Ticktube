/**
 * TickTube Smart Player - Core Logic
 * Developed by Dr David
 */

const API_KEY = "AIzaSyAY-llYbjBiY3VtfCGsqo4jC3SkALKTGwc";
let ytPlayer, upNextQueue = [];
let pipClosedManually = false;

// --- 1. DRAG LOGIC FOR PIP ---
const dragItem = document.getElementById("main-video-card");
const dragHandle = document.getElementById("drag-handle");
let active = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

dragHandle.addEventListener("mousedown", dragStart);
document.addEventListener("mousemove", drag);
document.addEventListener("mouseup", dragEnd);
dragHandle.addEventListener("touchstart", dragStart, {passive: false});
document.addEventListener("touchmove", drag, {passive: false});
document.addEventListener("touchend", dragEnd);

function dragStart(e) {
    if (!dragItem.classList.contains('pip-active')) return;
    initialX = (e.type === "touchstart" ? e.touches[0].clientX : e.clientX) - xOffset;
    initialY = (e.type === "touchstart" ? e.touches[0].clientY : e.clientY) - yOffset;
    active = true;
}
function dragEnd() { initialX = currentX; initialY = currentY; active = false; }
function drag(e) {
    if (active) {
        e.preventDefault();
        currentX = (e.type === "touchmove" ? e.touches[0].clientX : e.clientX) - initialX;
        currentY = (e.type === "touchmove" ? e.touches[0].clientY : e.clientY) - initialY;
        xOffset = currentX; yOffset = currentY;
        dragItem.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    }
}
function closePip() { 
    dragItem.classList.remove('pip-active'); 
    dragItem.style.transform = "none"; 
    xOffset = 0; yOffset = 0;
    pipClosedManually = true; 
}

// --- 2. CUSTOM DOWNLOAD MODAL & ANIMATION ---
function showDownloadModal() {
    const modal = document.createElement('div');
    modal.style = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #1a1a1a; color: white; padding: 25px; border-radius: 15px;
        border: 2px solid var(--primary); z-index: 10000; text-align: center;
        box-shadow: 0 0 20px rgba(255, 0, 122, 0.5); font-family: sans-serif;
        animation: modalFadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 40px; color: #00FFCC; margin-bottom: 15px;"></i>
        <h3 style="margin: 0 0 10px;">Download Started!</h3>
        <p style="font-size: 14px; opacity: 0.8; margin-bottom: 20px;">Your video is processing. Check your browser's download manager.</p>
        <button id="close-modal" style="background: var(--primary); color: white; border: none; padding: 10px 25px; border-radius: 8px; cursor: pointer; font-weight: bold;">Awesome</button>
    `;

    document.body.appendChild(modal);
    document.getElementById('close-modal').onclick = () => {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    };
}

function triggerCustomDownload(event) {
    const btn = event.currentTarget;
    const dlLink = document.getElementById('download-link');
    const videoUrl = dlLink ? dlLink.href : null;

    if (videoUrl && videoUrl !== window.location.href + '#' && videoUrl !== "") {
        btn.classList.add('downloading');
        btn.querySelector('span').innerText = "Starting...";

        // Open in new tab to bypass Standalone App lock
        window.open(videoUrl, '_blank', 'noopener,noreferrer');

        setTimeout(() => {
            showDownloadModal();
            btn.classList.remove('downloading');
            btn.querySelector('span').innerText = "Download";
        }, 3000);
    } else {
        alert("Please play a video first so I can find the download link!");
    }
}

// --- 3. PLAYER & APP LOGIC ---
window.onload = () => {
    const savedPic = localStorage.getItem('tiktube_profile_pic');
    if(savedPic) document.getElementById('profile-img').src = savedPic;
    updateOnlineStatus();
};

function updateOnlineStatus() {
    const text = document.getElementById('status-text');
    const dot = document.getElementById('status-dot');
    if (navigator.onLine) {
        text.textContent = "ONLINE"; text.className = "status-glow-online"; dot.style.color = "var(--online-green)";
    } else {
        text.textContent = "OFFLINE"; text.className = "status-glow-offline"; dot.style.color = "var(--offline-red)";
    }
}

const queryInput = document.getElementById('query');
const suggestionsBox = document.getElementById('suggestions');
queryInput.addEventListener('input', () => {
    const q = queryInput.value.trim();
    if (q.length < 2) { suggestionsBox.style.display = 'none'; return; }
    const cbName = 'jsonp_cb_' + Math.floor(Math.random() * 1000000);
    window[cbName] = (data) => { renderSuggestions(data[1]); delete window[cbName]; };
    const script = document.createElement('script');
    script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}&callback=${cbName}`;
    document.body.appendChild(script);
});

function renderSuggestions(list) {
    suggestionsBox.innerHTML = ''; suggestionsBox.style.display = 'block';
    list.forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-item'; div.textContent = item[0];
        div.onclick = () => { queryInput.value = item[0]; handleSearchAction(); };
        suggestionsBox.appendChild(div);
    });
}

function onYouTubeIframeAPIReady() {
    const savedVideo = JSON.parse(localStorage.getItem('tiktube_last_video'));
    const startId = savedVideo ? savedVideo.id : 'Way9Dexny3w';
    const startTitle = savedVideo ? savedVideo.title : 'Welcome to Tiktube';

    ytPlayer = new YT.Player('yt-player', {
        videoId: startId,
        playerVars: { 'modestbranding': 1, 'playsinline': 1, 'autoplay': 1 },
        events: { 
            'onReady': () => {
                document.getElementById('now-playing-title').textContent = startTitle;
                // Sync initial download link - Using y2mate for reliability
                document.getElementById('download-link').href = `https://www.y2mate.com/youtube/${startId}`;
                renderHistory();
                fetchRecommendations();
                fetchUpNext(startTitle);
            }
        }
    });
}

function playYoutubeGallery(id, title, thumb) {
    document.getElementById('local-video').pause();
    document.getElementById('local-video').classList.remove('active');
    document.getElementById('yt-player').classList.add('active');
    document.getElementById('now-playing-title').textContent = title;
    
    // Update Download Link for the new video - Fixed 404 issue
    document.getElementById('download-link').href = `https://www.y2mate.com/youtube/${id}`;

    if(ytPlayer?.loadVideoById) ytPlayer.loadVideoById(id);
    localStorage.setItem('tiktube_last_video', JSON.stringify({id, title, thumb}));
    addToHistory(id, title, thumb);
    fetchUpNext(title);
    suggestionsBox.style.display = 'none';
}

function handleLocalVideo(event) {
    const file = event.target.files[0];
    if (file) {
        const localVideo = document.getElementById('local-video');
        const ytPlayerElem = document.getElementById('yt-player');
        ytPlayerElem.classList.remove('active');
        if(ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
        localVideo.classList.add('active');
        localVideo.src = URL.createObjectURL(file);
        localVideo.play();
        document.getElementById('now-playing-title').textContent = file.name;
    }
}

async function fetchUpNext(q) {
    const list = document.getElementById('up-next-list');
    try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=6&q=${encodeURIComponent(q)}&type=video&key=${API_KEY}`);
        const data = await res.json();
        if(data.items) {
            list.innerHTML = '';
            data.items.forEach(v => {
                list.appendChild(createMiniItem(v.id.videoId, v.snippet.title, v.snippet.thumbnails.medium.url));
            });
        }
    } catch(e) {}
}

function changeProfilePic(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('profile-img').src = e.target.result;
            localStorage.setItem('tiktube_profile_pic', e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

document.getElementById('main-scroll').addEventListener('scroll', () => {
    const anchorRect = document.getElementById('player-anchor').getBoundingClientRect();
    if (anchorRect.bottom < 0) { if (!pipClosedManually) dragItem.classList.add('pip-active'); }
    else { dragItem.classList.remove('pip-active'); pipClosedManually = false; dragItem.style.transform = "none"; xOffset = 0; yOffset = 0; }
});

async function handleSearchAction() {
    const q = queryInput.value; if(!q) return;
    suggestionsBox.style.display = 'none';
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(q)}&type=video&key=${API_KEY}`);
    const data = await res.json();
    if(data.items) renderSearchResults(data.items);
}

function renderSearchResults(items) {
    const grid = document.getElementById('results-grid');
    grid.innerHTML = ''; document.getElementById('search-results-page').style.display = 'block';
    items.forEach(v => {
        const card = document.createElement('div');
        card.innerHTML = `<img src="${v.snippet.thumbnails.medium.url}" style="width:100%; border-radius:8px;"><h4>${v.snippet.title}</h4>`;
        card.onclick = () => { playYoutubeGallery(v.id.videoId, v.snippet.title, v.snippet.thumbnails.medium.url); document.getElementById('search-results-page').style.display = 'none'; };
        grid.appendChild(card);
    });
}

function createMiniItem(id, title, thumb) {
    const div = document.createElement('div');
    div.className = 'mini-item';
    div.innerHTML = `<img src="${thumb}"><h5>${title}</h5>`;
    div.onclick = () => playYoutubeGallery(id, title, thumb);
    return div;
}

function addToHistory(id, title, thumb) {
    let h = JSON.parse(localStorage.getItem('tiktube_history')) || [];
    h = h.filter(x => x.id !== id); h.unshift({id, title, thumb});
    localStorage.setItem('tiktube_history', JSON.stringify(h.slice(0,20)));
    renderHistory();
}
function renderHistory() {
    const list = document.getElementById('history-list');
    const h = JSON.parse(localStorage.getItem('tiktube_history')) || [];
    list.innerHTML = '';
    h.forEach(v => list.appendChild(createMiniItem(v.id, v.title, v.thumb)));
}
async function fetchRecommendations() {
    const list = document.getElementById('rec-list');
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=trending&type=video&key=${API_KEY}`);
    const data = await res.json();
    if(data.items) {
        list.innerHTML = '';
        data.items.forEach(v => list.appendChild(createMiniItem(v.id.videoId, v.snippet.title, v.snippet.thumbnails.medium.url)));
    }
}
function scrollToSection(id) { document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }
function clearHistory() { localStorage.removeItem('tiktube_history'); renderHistory(); }

// --- 4. YOUTUBE API INIT ---
const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api"; 
document.head.appendChild(tag);



