import { motion } from 'framer-motion';

const stations = ['CHENNAI', 'MADURAI', 'COIMBATORE', 'TRICHY', 'SALEM', 'ERNAKULAM', 'NAGERCOIL', 'TIRUNELVELI'];

export default function HomeHero() {
  return (
    <section className="sr-cinema-hero">
      <div className="sr-night-sky" /><div className="sr-fog sr-fog-a" /><div className="sr-fog sr-fog-b" />
      <div className="sr-route-lights">{Array.from({ length: 18 }).map((_, index) => <i key={index} style={{ '--i': index }} />)}</div>
      <motion.div className="sr-hero-core" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
        <p className="sr-eyebrow">SOUTHRAIL PREMIUM RESERVATION</p>
        <h1>SOUTH INDIA<br />CONNECTED</h1>
        <p className="sr-hero-mantra">Reserve. Travel. Experience.</p>
        <div className="sr-station-ribbon">{stations.map((station, index) => <motion.span key={station} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + index * 0.06 }}>{station}</motion.span>)}</div>
        <div className="sr-animated-route"><b /><em /></div>
      </motion.div>
      <motion.div className="sr-silhouette-train" animate={{ x: ['-12%', '8%', '-12%'] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}><span /><span /><span /><span /></motion.div>
      <div className="sr-platform-line" />
    </section>
  );
}
