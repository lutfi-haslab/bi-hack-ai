/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    // Only add the external for server-side bundles
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pdf-parse');
    }
    
    return config;
  },
  // Optional: If you're using serverless functions, you might need this
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
};

module.exports = nextConfig;