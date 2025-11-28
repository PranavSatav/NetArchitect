
# 🌐 NetArchitect AI - Next-Gen Network Simulator

![Status](https://img.shields.io/badge/Status-Active-success)
![Stack](https://img.shields.io/badge/Tech-React%20%7C%20TypeScript%20%7C%20Gemini%20AI-blue)
![License](https://img.shields.io/badge/License-MIT-purple)

**NetArchitect AI** is an advanced, browser-based network topology designer and simulator. It combines a drag-and-drop visual interface with a **realistic Cisco IOS-like CLI**, physics-based packet simulation, and **Generative AI** integration to teach networking concepts, analyze security vulnerabilities, and simulate complex enterprise architectures.

---

## ✨ Key Features

### 🧠 AI-Powered Analysis (Powered by Google Gemini)
- **Security Scanner**: Act as a Red Team expert to find vulnerabilities (e.g., unpatched devices, missing firewalls) and visualize them instantly on the topology.
- **Architecture Review**: Get professional tips on redundancy, bottlenecks, and industry best practices based on your current layout.
- **"PacketSniffer" Assistant**: A witty, context-aware chatbot that answers questions about your specific topology.
- **CLI Auto-Fix**: If you type a wrong command in the terminal, the AI analyzes the error and suggests the correct syntax in real-time.

### 💻 Realistic CLI Emulator
- **Cisco IOS Simulation**: Supports User Exec (`>`), Privileged Exec (`#`), Global Config (`(config)#`), Interface Config, and VLAN Config modes.
- **Real State Management**: 
  - Create VLANs (`vlan 10`, `name SALES`) and see them stored in the switch database.
  - Configure Interfaces (`int g0/1`, `switchport access vlan 10`).
  - **Simulated Boot**: Run `reload` to see a realistic boot sequence.
- **Context-Aware**: `show ip interface brief` and `show cdp neighbors` dynamically scan the visual topology to report real connections.
- **Smart Features**: Tab auto-complete, command history (Up/Down arrows), and abbreviations (`sh run`, `conf t`).

### 📐 Visual Topology Builder
- **Multi-Floor Architecture**: Manage complex networks across "Server Room", "Floor 1", "Branch Office", etc.
- **Device Catalog**: Drag & drop Routers, L2/L3 Switches, Firewalls, SD-WAN Edges, Servers, IoT devices, and more.
- **Visual Feedback**: 
  - Cables change color based on VLAN assignments (Orange=10, Purple=20).
  - Broken links (Shutdown interfaces) appear as red dotted lines.
  - Real-time packet flow visualization.

### 🎮 Gamification & Training
- **Mission Mode**: Interactive scenarios ranging from Novice to Pro.
  - *The Startup*: Basic connectivity.
  - *Department Separation*: VLAN configuration.
  - *Data Center*: Spine-Leaf architecture.
- **Step-by-Step Verification**: The engine logically checks your topology and configurations to verify mission success.

---

## 🛠️ Tech Stack

This project uses a modern, high-performance frontend stack:

*   **Framework**: [React 18](https://react.dev/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Visualization**: [React Flow](https://reactflow.dev/) (Node-based UI)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **AI Integration**: [Google GenAI SDK](https://www.npmjs.com/package/@google/genai)
*   **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started (Local Development)

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/netarchitect-ai.git
    cd netarchitect-ai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure API Key**
    *   Get a free API Key from [Google AI Studio](https://aistudio.google.com/).
    *   Create a `.env` file in the root directory:
        ```env
        API_KEY=your_google_gemini_api_key_here
        ```

4.  **Run the application**
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` in your browser.

---

## ☁️ How to Host on Vercel

This project is optimized for Vercel deployment.

1.  **Push to GitHub**: Ensure your code is pushed to a GitHub repository.
2.  **Create Vercel Project**:
    *   Log in to [Vercel](https://vercel.com/).
    *   Click "Add New..." -> "Project".
    *   Select your `netarchitect-ai` repository.
3.  **Configure Build Settings**:
    *   Framework Preset: **Vite** (Vercel should detect this automatically).
    *   Root Directory: `./`
4.  **Set Environment Variables** (Crucial for AI):
    *   Expand the **Environment Variables** section.
    *   Key: `API_KEY`
    *   Value: `Your_Actual_Gemini_Key`
5.  **Deploy**: Click "Deploy". Vercel will build your app and provide a live URL (e.g., `https://netarchitect-ai.vercel.app`).

---

## 📖 CLI Cheat Sheet (Simulated)

**Basic Verification:**
```bash
Switch> enable
Switch# show vlan brief      # See VLAN database
Switch# show ip int br       # See interface status
Switch# show run             # See full configuration
```

**VLAN Creation:**
```bash
Switch# conf t
Switch(config)# vlan 10
Switch(config-vlan)# name SALES
Switch(config-vlan)# exit
```

**Port Assignment:**
```bash
Switch(config)# interface g0/1
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# no shutdown
```

**System Management:**
```bash
Switch# write memory         # Save config
Switch# reload               # Reboot device
Switch# traceroute 8.8.8.8   # Trace path
```

---

## 🤝 Contributing

Contributions are welcome! Whether it's adding new "Missions", improving the packet simulation logic, or adding new device icons.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.