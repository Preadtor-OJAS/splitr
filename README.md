# 👑 Splitr: The Pinnacle of Expense Management

Welcome to **Splitr**, an enterprise-grade, meticulously engineered financial synchronization platform designed to effortlessly untangle the complexities of shared expenses. Built on the bleeding edge of modern web architecture, Splitr delivers a sublime, frictionless experience for tracking, splitting, and settling financial obligations with friends, family, and colleagues.

## 🌟 Architectural Marvels & Key Features

### ⚡ Sub-Millisecond Real-Time Synchronization
Powered by the robust **Convex** backend engine, Splitr completely eliminates the concept of "refreshing a page." Every expense logged, every friend request sent, and every chat message delivered is synchronized globally across all connected devices in absolute real-time. 

### 👥 Advanced Group & Peer-to-Peer Splitting Mechanics
Whether orchestrating the finances of a multi-week international expedition or simply splitting a single coffee, Splitr flawlessly scales to your exact needs. 
- **Dynamic Allocation Algorithm:** Split costs equally, calculate precise percentages, or assign exact monetary values down to the cent.
- **Intelligent Lifecycle Management:** Our architecture ensures that when a group is dissolved by an administrator, all orphaned expenses and settlements are securely and automatically purged, maintaining absolute database purity.

### 💬 Fully Integrated Real-Time Communication
Communication is the foundation of financial harmony. Splitr features an instantaneous, built-in messaging portal. 
- **Impenetrable Security Protocols:** Includes a sophisticated user-blocking architecture. If a user is blocked, the system strictly enforces boundary control at the database level, instantly severing their ability to message you or initiate financial splits.

### 🧮 Intelligent Debt Simplification Engine
Why execute ten transactions when you only need one? Splitr employs a powerful debt-simplification matrix that automatically analyzes complex, multi-layered group debts and elegantly condenses them into the minimum possible number of transactions. "Who owes who" has never been clearer.

### 🔐 Ironclad Identity & Authentication
Your financial data demands Fort Knox-level security. By leveraging **Clerk**, Splitr provides a seamless yet highly secure authentication gateway. User identities are verified and managed with state-of-the-art standards, allowing you to sign in with unwavering confidence.

### 🎨 Sublime, Responsive User Interface
Crafted with **Next.js 15**, **React 19**, and **Tailwind CSS**, the UI is a masterclass in modern digital design. 
- **Adaptive Aesthetics:** Features a flawless, ultra-responsive Light and Dark mode that dynamically adapts to your environment.
- **Polished Micro-Interactions:** Enhanced with Radix UI and Sonner to provide buttery-smooth animations, accessible components, and elegant, non-intrusive notifications.

## 🏗 The Elite Technology Stack

- **Frontend Core:** [Next.js 15](https://nextjs.org/) (App Router enhanced with Turbopack), React 19
- **Styling Architecture:** Tailwind CSS, Radix UI Primitives, Lucide Iconography
- **Backend Infrastructure:** [Convex](https://convex.dev/) (Serverless Real-Time Database)
- **Authentication Gateway:** [Clerk](https://clerk.com/) Identity Management

---

## 💻 Deployment & Local Execution Protocol

### 1. Initialize the Repository
```bash
git clone https://github.com/Preadtor-OJAS/splitr.git
cd splitr
```

### 2. Install Core Dependencies
```bash
npm install
```

### 3. Configure Secure Environment Variables
Create a `.env.local` file in the root directory and securely inject your API keys:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

CONVEX_DEPLOYMENT=your_convex_deployment
NEXT_PUBLIC_CONVEX_URL=your_convex_url
```

### 4. Ignite the Backend Infrastructure
Initialize the Convex development server to synchronize the database schema and deploy real-time functions:
```bash
npx convex dev
```

### 5. Launch the Client Portal
In a secondary terminal instance, boot the Next.js Turbopack development server:
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) to experience the platform.
