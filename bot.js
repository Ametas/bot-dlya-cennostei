require('dotenv').config()

const TelegramBot = require('node-telegram-bot-api')

const token = process.env.BOT_TOKEN
const bot = new TelegramBot(token, { polling: true })
const botConfig = require('./config/bot.config.json')

const locations = require('./assets/locations.json')

const {
  getDistanceInKm,
  isOnLocation,
} = require('./controllers/locations.controller')

bot.userData = {}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  const options = {
    reply_markup: {
      keyboard: [
        [{ text: 'Получить текущую локацию', request_location: true }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  }

  bot
    .sendMessage(
      chatId,
      'Нажмите кнопку, чтобы отправить свою текущую локацию:',
      options,
    )
    .catch((error) => console.error('Error sending msg', error))
})

bot.on('message', (msg) => {
  const chatId = msg.chat.id

  if (msg.location) {
    const { latitude, longitude } = msg.location

    let closestLocation = null
    let closestDistance = Infinity

    for (const [locationName, coords] of Object.entries(locations)) {
      const distance = getDistanceInKm(
        latitude,
        longitude,
        coords.latitude,
        coords.longitude,
      )
      if (distance < closestDistance) {
        closestDistance = distance
        closestLocation = locationName
      }
    }

    const yandexMapsUrl = `https://yandex.ru/maps/?ll=${longitude},${latitude}&z=12&mode=routes&pt=${longitude},${latitude}`

    bot
      .sendMessage(
        chatId,
        `Ваша текущая локация:\nШирота: ${latitude}\nДолгота: ${longitude}\nБлижайшая локация: ${closestLocation} (расстояние: ${closestDistance.toFixed(
          2,
        )} км)\nВот маршрут в Яндекс.Картах: ${yandexMapsUrl}`,
      )
      .catch((error) => console.error('Error sending location message', error))

    if (closestDistance <= 1) {
      const options = {
        reply_markup: {
          keyboard: [[{ text: 'Начать тест' }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }

      bot
        .sendMessage(
          chatId,
          'Вы находитесь в радиусе 1 км от ближайшей локации. Нажмите кнопку, чтобы начать тест:',
          options,
        )
        .catch((error) =>
          console.error('Error sending test button message', error),
        )

      bot.userData[chatId] = {
        userLocation: { latitude, longitude },
        closestLocation: closestLocation,
        currentQuestionIndex: 0,
      }
    } else {
      const placesButtons = locations[closestLocation].places.map(
        (place, index) => {
          return [
            { text: place.name, callback_data: `${closestLocation}:${index}` },
          ]
        },
      )

      const options = {
        reply_markup: {
          inline_keyboard: placesButtons,
        },
      }

      bot
        .sendMessage(
          chatId,
          `Вы сейчас находитесь в районе ${closestLocation}. Выберите подлокацию:`,
          options,
        )
        .catch((error) => console.error('Error sending places message', error))
    }
  } else if (msg.text === 'Начать тест') {
    const userData = bot.userData[chatId]
    if (userData) {
      const closestLocation = userData.closestLocation
      const questions = locations[closestLocation].questions
      const currentQuestionIndex = userData.currentQuestionIndex

      if (currentQuestionIndex < questions.length) {
        const question = questions[currentQuestionIndex]
        bot.sendMessage(chatId, question, {
          reply_markup: {
            remove_keyboard: true,
          },
        })

        userData.currentQuestionIndex += 1
      } else {
        bot.sendMessage(chatId, 'Тест завершен! Спасибо за участие.')
        delete bot.userData[chatId]
      }
    }
  } else if (
    bot.userData[chatId] &&
    bot.userData[chatId].currentQuestionIndex > 0
  ) {
    const userData = bot.userData[chatId]
    const closestLocation = userData.closestLocation
    const questions = locations[closestLocation].questions
    const currentQuestionIndex = userData.currentQuestionIndex

    if (currentQuestionIndex < questions.length) {
      const question = questions[currentQuestionIndex]
      bot.sendMessage(chatId, question, {
        reply_markup: {
          remove_keyboard: true,
        },
      })

      userData.currentQuestionIndex += 1
    } else {
      bot.sendMessage(chatId, 'Тест завершен! Спасибо за участие.')
      delete bot.userData[chatId]
    }
  }
})

bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message
  const chatId = msg.chat.id
  const [locationName, placeIndex] = callbackQuery.data.split(':')
  const userLocation = bot.userData[chatId]?.userLocation

  if (userLocation) {
    const selectedPlace = locations[locationName].places[placeIndex]

    if (selectedPlace) {
      const distanceToPlace = getDistanceInKm(
        userLocation.latitude,
        userLocation.longitude,
        selectedPlace.latitude,
        selectedPlace.longitude,
      )

      let responseText = isOnLocation(distanceToPlace, botConfig.accuracy)
        ? 'Вы на месте!'
        : `Вы находитесь в ${distanceToPlace.toFixed(2)} км от ${
            selectedPlace.name
          }.`

      bot
        .sendMessage(chatId, responseText)
        .catch((error) =>
          console.error('Error sending distance message', error),
        )
    }
  } else {
    bot.sendMessage(
      chatId,
      'Не удалось получить ваше местоположение. Пожалуйста, отправьте его снова.',
    )
  }

  bot.answerCallbackQuery(callbackQuery.id)
})

bot.on('polling_error', (error) => console.error('Polling error', error))
