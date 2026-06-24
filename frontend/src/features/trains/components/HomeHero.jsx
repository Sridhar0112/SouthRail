import { BookingSearchPanel, popularRoutes } from './SearchCommandCenter.jsx';

const trust = [
  ['PCI-ready payments', 'Encrypted checkout'],
  ['PNR-grade tickets', 'Instant itinerary'],
  ['24/7 operations', 'Human support'],
  ['Live seat logic', 'Availability first'],
];

export default function HomeHero({ searchProps }) {
  const applyRoute = (route) => searchProps.applyRecentSearch({ source: route.from, destination: route.to, journeyDate: searchProps.today, travelClass: '3A', quota: 'GENERAL' });
  return (
    <section className="sr-reservation-hero">
      <div className="sr-product-topbar"><div className="sr-brand-mark"><span>SR</span><div><strong>SouthRail</strong><small>Reservation System</small></div></div><div className="sr-topbar-meta"><b>LIVE</b><span>Southern Railway network</span></div></div>
      <div className="sr-hero-grid">
        <div className="sr-hero-copy">
          <p className="sr-eyebrow">PRODUCTION RAIL BOOKING</p>
          <h1>Search, compare, and reserve South India trains.</h1>
          <p className="sr-hero-mantra">A high-confidence reservation flow for routes, availability, fares, quota, and seat booking.</p>
          <div className="sr-trust-grid">{trust.map(([label, detail]) => <div key={label}><strong>{label}</strong><span>{detail}</span></div>)}</div>
        </div>
        <BookingSearchPanel searchProps={searchProps} compact />
      </div>
      <div className="sr-first-viewport-boards">
        <div className="sr-route-table"><div className="sr-board-heading"><span>POPULAR ROUTES</span><b>Tap to prefill</b></div>{popularRoutes.map((route) => <button key={route.name} type="button" onClick={() => applyRoute(route)}><span>{route.name}</span><small>{route.fastest} · {route.demand} demand</small></button>)}</div>
        <div className="sr-availability-board"><div className="sr-board-heading"><span>QUICK AVAILABILITY</span><b>Fast access</b></div><button type="button" onClick={() => searchProps.handleSubmit(searchProps.onSubmit, searchProps.onInvalid)()}>Check selected route now</button><button type="button" onClick={() => applyRoute(popularRoutes[0])}>Today: MS → MDU</button><button type="button" onClick={() => applyRoute(popularRoutes[1])}>Today: MAS → CBE</button></div>
      </div>
    </section>
  );
}
