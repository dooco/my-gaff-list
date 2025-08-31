1.1 Database Indexing & Performance

- Add PostgreSQL GIN indexes for full-text search on title, description fields
- Create composite indexes on frequently queried fields (county_id, town_id, rent_monthly, bedrooms)
- Implement PostgreSQL full-text search with search vectors
- Add trigram similarity search for fuzzy matching
  1.2 Enhanced Search Algorithm
- Implement ranking algorithm considering:
- Quality Score: Based on completeness of listing, photo count, description length
- Popularity Score: Views, saves, inquiries, response rate
- Price Competitiveness: Compare to similar properties in area
- Freshness: Boost recently updated/added listings
- Add search relevance scoring using PostgreSQL's ts_rank

  1.3 Advanced Filtering System

- Add new filter fields:
- Lease duration (short-term, 6 months, 1 year+)
- Available from date
- Pet-friendly status
- Parking availability
- Garden/balcony/patio
- Multiple BER rating selection
- Bills included/excluded
- Viewing arrangement type
- Implement filter combinations with AND/OR logic
