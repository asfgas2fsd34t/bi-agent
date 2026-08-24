CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.channel_revenue (
    occurred_at TIMESTAMPTZ NOT NULL,
    channel TEXT NOT NULL,
    region TEXT NOT NULL,
    category TEXT NOT NULL,
    net_revenue NUMERIC(12, 2) NOT NULL,
    gmv NUMERIC(12, 2) NOT NULL,
    recognized_revenue NUMERIC(12, 2) NOT NULL
);

TRUNCATE TABLE analytics.channel_revenue;

INSERT INTO analytics.channel_revenue
    (occurred_at, channel, region, category, net_revenue, gmv, recognized_revenue)
VALUES
    ('2026-07-15T12:00:00Z', '抖音', '华东', '直播电商', 4.82, 5.69, 4.24),
    ('2026-07-15T12:00:00Z', '淘宝', '华东', '货架电商', 3.46, 4.08, 3.04),
    ('2026-07-15T12:00:00Z', '京东', '华北', '货架电商', 2.66, 3.14, 2.34),
    ('2026-07-15T12:00:00Z', '小红书', '华南', '内容电商', 1.10, 1.30, 0.97),
    ('2026-07-15T12:00:00Z', '官网', '华东', '自营电商', 0.44, 0.52, 0.39),
    ('2025-07-15T12:00:00Z', '抖音', '华东', '直播电商', 4.06, 4.79, 3.57),
    ('2025-07-15T12:00:00Z', '淘宝', '华东', '货架电商', 3.08, 3.63, 2.71),
    ('2025-07-15T12:00:00Z', '京东', '华北', '货架电商', 2.49, 2.94, 2.19),
    ('2025-07-15T12:00:00Z', '小红书', '华南', '内容电商', 0.86, 1.02, 0.76),
    ('2025-07-15T12:00:00Z', '官网', '华东', '自营电商', 0.50, 0.59, 0.44);
