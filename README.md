Histogram which captures last 30 days of tweets on a particular search term.
===================

Application is using Node.js, Express.js and Twitter API.


Installing and Running
    ----

Install node module dependencies:

```
npm install
```

Run application:

```
node server.js
```

One can request aggregated data by hour or by day.

By Hour (Go to [http://localhost:1337/search/%23nodejs/hour]) -

Sample data would look like : "3-29-2015:2":150 where "3-29-2015" is the date, and "2" is the hour (2:00 am in this case) and "150" is the number of tweets in that hour.

By Day (Go to [http://localhost:1337/search/%23nodejs/day]) -

Sample data would look like : "3-29-2015":4693 where "3-29-2015" is the date and "4693" is the number of tweets in that day.

