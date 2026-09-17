# STARWEFT Audio & Sound Effect Specification Contract

> **Target Creator:** Leon (Ableton Suite / Modular Sound Design)  
> **Engine Consumer:** `js/audio.js` (Web Audio API & HTML5 Audio)  
> **Aesthetic Foundation:** Dark industrial sci-fi, analog radio telemetry, deep void acoustics, mechanical tactile feedback. Pure diegetic warmth, zero slot-machine arcade noise.

---

## 1. Technical Audio Specifications

To prevent browser audio distortion, clipping, or platform incompatibilities across Chrome, Safari, Firefox, and mobile WebAudio contexts:

| Parameter | Specification | Rationale |
| :--- | :--- | :--- |
| **Primary Master Format** | **16-bit or 24-bit PCM WAV (or FLAC)** for source masters; web delivery exported to **WebM (Opus)** and **MP3 / OGG** (or 16-bit 44.1kHz WAV for short UI transients). | Broad cross-browser support without browser decode lag. |
| **Sample Rate** | **44.1 kHz or 48.0 kHz** uniform. | Avoids internal WebAudio resampler artifacts and aliasing. |
| **Channel Layout** | **Mono** for point-source UI / map sfx; **Stereo** for ambient beds and spatial drones. | WebAudio spatial panners and 2D canvas panners require mono inputs to pan accurately. |
| **Peak True Amplitude** | **-1.0 dBFS Peak** (transients); **-14 to -18 LUFS** (ambient beds / drones). | Prevents inter-sample peaks and digital clipping during WebAudio summing. |
| **Tail & DC Offset** | **Zero-crossing cutoffs**; 5–15ms micro-fadeout tails; 0.0 Hz DC offset high-pass filtered. | Eliminates speaker "pop" and clicks when triggers start or stop abruptly. |

---

## 2. Cue Registry & Asset Manifest

### Category A: Diegetic Sub-Space Transmissions & Radio Hails
*Used by the Comms Ticker when ambient hails, planetary pleas, or pirate demands arrive.*

| Cue ID | Description / Mood | Length | Target Frequency / Character |
| :--- | :--- | :--- | :--- |
| `radio_chirp_inbound` | Subtle carrier wave handshake tone indicating an incoming transmission. | 350–600 ms | High-frequency telemetry chirp (analog modem / Sputnik feel), gently filtered. |
| `radio_static_burst` | Short burst of cosmic microwave background noise and atmospheric flutter. | 400–800 ms | Soft pink noise modulated with slow phase drift and subtle wow/flutter. |
| `radio_distress_beacon` | Urgent, rhythmic pulse indicating a ship or outpost under attack. | 1.2–2.0 s | Resonant sine/triangle blip with slight pitch sag and decaying tape delay. |
| `radio_cryptic_precursor`| Eerie, low metallic resonance when encountering dormant Weft precursor relics. | 2.5–4.0 s | Reverb-drenched bowed metal, sub-bass pulse (40–60 Hz), slight granular shimmer. |

### Category B: Industrial Logistics & Tactile Verbs
*Used when interacting with the Logistics Exchange, issuing flight orders, and completing deliveries.*

| Cue ID | Description / Mood | Length | Target Frequency / Character |
| :--- | :--- | :--- | :--- |
| `manifest_stamp_accepted`| Mechanical punch/click confirming commitment to a formal Pledge. | 200–350 ms | Heavy solenoid click, mechanical relay latch, dampened pneumatic thud. |
| `manifest_delivered_cash` | Satisfying mechanical register / trade terminal receipt sound. | 400–700 ms | Dual-tone metallic chime, subtle analog relay snap, warm low-end thud (rewarding). |
| `manifest_breached` | Low, discordant warning buzzer when a contract deadline expires. | 600–900 ms | Muted square-wave alarm, falling minor-second interval, cold analog buzz. |
| `ship_launch_thrust` | Sub-bass engine rumble as a freighter departs dock. | 800–1200 ms | Warm low-frequency sweep (50Hz → 120Hz), muffled hydrogen burn. |
| `cargo_clamp_engage` | Magnetic clamps locking bulk cargo onto a freighter hull. | 250–400 ms | Sharp electromagnetic clunk, metallic clamp impact with high-damping tail. |

### Category C: Cosmic Threat & Fray Creep
*Used when the Scourge advances, a trade lane fractures, or a system goes dark.*

| Cue ID | Description / Mood | Length | Target Frequency / Character |
| :--- | :--- | :--- | :--- |
| `fray_pulse_distant` | Low-frequency ominous heartbeat signaling a Scourge expansion pulse. | 1.5–3.0 s | Sub-bass thud (35–55 Hz) with distorted granular tail and reversed reverb swell. |
| `lane_fracture` | Sound of an active trade corridor breaking under pressure. | 800–1400 ms | Glass-like harmonic shatter pitch-dropped into a low hollow boom. |
| `system_blackout` | Sound of planetary orbital grid failing as a colony goes dark. | 1.8–2.5 s | Downward analog pitch-dive, power generator spin-down, fading electrical hum. |

---

## 3. Integration & Engine Playback Architecture

All sounds will be registered in `D.AUDIO` and played through `SW.audio.play(cueId, opts)`:
* **Pitch Randomization:** Inbound chirps and cargo stamps automatically apply slight seeded pitch deviation (`±4%`) to prevent acoustic fatigue during repeated trade runs.
* **Volume Attenuation:** Sound effects scale volume based on whether the action occurred in the currently focused system (100% volume) or across remote sectors (30% volume, low-pass filtered at 1.2 kHz to simulate distant sub-space telemetry).
* **Mute & Captions Contract:** Every sound effect must trigger a paired event for the visual subtitles element (`#audioCaption`) for accessibility compliance.
