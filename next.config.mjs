/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required for static export
  },
  // Preserve trailing slashes to match current behavior
  trailingSlash: true,
};

export default nextConfig;
