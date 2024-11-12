import { useEffect } from 'react'

const Map = () => {
  useEffect(() => {
    const script = document.createElement('script')
    script.src =
      'https://api-maps.yandex.ru/2.1/?apikey=826955e1-1d34-4121-809c-5a60a695cc99&lang=en_US'
    script.async = true
    script.onload = () => {
      ymaps.ready(initMap)
    }
    document.body.appendChild(script)
  }, [])

  const initMap = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const map = new window.ymaps.Map('yandex-map', {
          center: [latitude, longitude], // Динамическое местоположение
          zoom: 10,
        })

        const placemark = new window.ymaps.Placemark([latitude, longitude], {
          balloonContent: 'Your location',
        })

        map.geoObjects.add(placemark)
      },
      (error) => {
        console.error('Error getting location', error)
      },
    )
  }

  return (
    <div
      id="yandex-map"
      style={{ width: '1000px', height: '500px', border: '1px solid red' }}
    ></div>
  )
}

export default Map
