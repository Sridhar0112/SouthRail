insert into roles (id, name, description) values
('10000000-0000-4000-9000-000000000001', 'ROLE_USER', 'Passenger user'),
('10000000-0000-4000-9000-000000000002', 'ROLE_ADMIN', '10000000-0000-4000-9000-000000000002')
on conflict do nothing;

insert into stations (id, code, name, city, state, latitude, longitude, created_at, updated_at) values
('20000000-0000-4000-9000-000000000001', 'MAS', 'MGR Chennai Central', 'Chennai', 'Tamil Nadu', 13.0827, 80.2707, now(), now()),
('20000000-0000-4000-9000-000000000002', 'SBC', 'KSR Bengaluru City', 'Bengaluru', 'Karnataka', 12.9784, 77.5696, now(), now()),
('20000000-0000-4000-9000-000000000003', 'ERS', 'Ernakulam Junction', 'Kochi', 'Kerala', 9.9698, 76.2910, now(), now()),
('20000000-0000-4000-9000-000000000004', 'HYB', 'Hyderabad Deccan', 'Hyderabad', 'Telangana', 17.3850, 78.4867, now(), now()),
('20000000-0000-4000-9000-000000000005', 'MDU', 'Madurai Junction', 'Madurai', 'Tamil Nadu', 9.9252, 78.1198, now(), now()),
('20000000-0000-4000-9000-000000000006', 'CBE', 'Coimbatore Junction', 'Coimbatore', 'Tamil Nadu', 11.0168, 76.9558, now(), now()),
('20000000-0000-4000-9000-000000000007', 'MAQ', 'Mangaluru Central', 'Mangaluru', 'Karnataka', 12.9141, 74.8560, now(), now()),
('20000000-0000-4000-9000-000000000008', 'TVC', 'Thiruvananthapuram Central', 'Thiruvananthapuram', 'Kerala', 8.5241, 76.9366, now(), now())
on conflict do nothing;

insert into trains (id, number, name, category, active, created_at, updated_at) values
('8ddad0c4-0000-4000-9000-000000000001', '12658', 'Chennai Mail', 'Superfast', true, now(), now()),
('8ddad0c4-0000-4000-9000-000000000002', '12626', 'Kerala Express', 'Superfast', true, now(), now()),
('8ddad0c4-0000-4000-9000-000000000003', '22637', 'West Coast SF Express', 'Superfast', true, now(), now())
on conflict do nothing;

insert into routes (id, train_id, route_name, source_station_id, destination_station_id, created_at, updated_at) values
('30000000-0000-4000-9000-000000000001', '8ddad0c4-0000-4000-9000-000000000001', 'Bengaluru to Chennai', '20000000-0000-4000-9000-000000000002', '20000000-0000-4000-9000-000000000001', now(), now()),
('30000000-0000-4000-9000-000000000002', '8ddad0c4-0000-4000-9000-000000000002', 'Thiruvananthapuram to Chennai', '20000000-0000-4000-9000-000000000008', '20000000-0000-4000-9000-000000000001', now(), now()),
('30000000-0000-4000-9000-000000000003', '8ddad0c4-0000-4000-9000-000000000003', 'Mangaluru to Coimbatore', '20000000-0000-4000-9000-000000000007', '20000000-0000-4000-9000-000000000006', now(), now())
on conflict do nothing;

insert into route_stops (id, train_id, station_id, stop_order, arrival_time, departure_time, day_offset, distance_km, platform, created_at, updated_at) values
('40000000-0000-4000-9000-000000000001', '8ddad0c4-0000-4000-9000-000000000001', '20000000-0000-4000-9000-000000000002', 1, null, '22:40', 0, 0, '5', now(), now()),
('40000000-0000-4000-9000-000000000002', '8ddad0c4-0000-4000-9000-000000000001', '20000000-0000-4000-9000-000000000001', 2, '04:20', null, 1, 362, '7', now(), now()),
('40000000-0000-4000-9000-000000000003', '8ddad0c4-0000-4000-9000-000000000002', '20000000-0000-4000-9000-000000000008', 1, null, '11:15', 0, 0, '1', now(), now()),
('40000000-0000-4000-9000-000000000004', '8ddad0c4-0000-4000-9000-000000000002', '20000000-0000-4000-9000-000000000003', 2, '16:20', '16:25', 0, 205, '3', now(), now()),
('40000000-0000-4000-9000-000000000005', '8ddad0c4-0000-4000-9000-000000000002', '20000000-0000-4000-9000-000000000001', 3, '06:40', null, 1, 905, '4', now(), now()),
('40000000-0000-4000-9000-000000000006', '8ddad0c4-0000-4000-9000-000000000003', '20000000-0000-4000-9000-000000000007', 1, null, '23:45', 0, 0, '2', now(), now()),
('40000000-0000-4000-9000-000000000007', '8ddad0c4-0000-4000-9000-000000000003', '20000000-0000-4000-9000-000000000006', 2, '06:10', null, 1, 407, '6', now(), now())
on conflict do nothing;

insert into coaches (id, train_id, coach_code, travel_class, capacity, created_at, updated_at) values
('50000000-0000-4000-9000-000000000001', '8ddad0c4-0000-4000-9000-000000000001', 'B1', '3A', 72, now(), now()),
('50000000-0000-4000-9000-000000000002', '8ddad0c4-0000-4000-9000-000000000002', 'S1', 'SL', 80, now(), now()),
('50000000-0000-4000-9000-000000000003', '8ddad0c4-0000-4000-9000-000000000003', 'C1', 'CC', 78, now(), now())
on conflict do nothing;
