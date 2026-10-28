import requests
tests = [
    ('/api/health', 'Health'),
    ('/api/weather/current?city=Vijayawada&country=IN', 'Weather'),
    ('/api/weather/forecast?city=Vijayawada&country=IN', 'Forecast'),
    ('/api/favorites', 'Favourites'),
    ('/static/css/style.css', 'CSS'),
    ('/static/js/app.js', 'JS'),
    ('/static/img/weather_hero_bg.png', 'Hero BG Image'),
    ('/static/img/earth_globe.png', 'Globe Image'),
]
for path, name in tests:
    r = requests.get('http://127.0.0.1:5000' + path, timeout=15)
    print(f'[{r.status_code}] {name}')
