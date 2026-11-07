/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Spending page used to live at /budget. Keep old links working
  // (query strings like ?year=2025&tab=actual are passed through).
  async redirects() {
    return [
      { source: "/budget", destination: "/spending", permanent: true },
      // Expenses moved onto each councillor's profile.
      { source: "/expenses", destination: "/councillors", permanent: true },
    ];
  },
};

export default nextConfig;
