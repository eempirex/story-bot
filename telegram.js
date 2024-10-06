const MESSAGES = require("./const");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

let mounted = false
let allValidatorsOrigin = [];
let activeValidatorsOrigin = [];

/**
 * Reads validators from the JSON file.
 * @returns {Promise<Object>} Parsed validators data.
 */
const readValidatorsFromFile = async () => {
  const data = await fs.promises.readFile("validators.json", "utf8");
  return JSON.parse(data);
};

/**
 * Saves validators to the JSON file.
 * @param {Object} validators - The validators data to save.
 */
const saveValidatorsToFile = async (validators) => {
  try {
    await fs.promises.writeFile("validators.json", JSON.stringify(validators, null, 2));
  } catch (error) {
    console.error("Error saving validators:", error);
  }
};

/**
 * Validates the format of the validator address.
 * @param {string} address - The validator address to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
const isValidValidatorAddress = (address) => {
  const prefix = "storyvaloper1";

  return address.startsWith(prefix) && address.length === 51;
};

/**
 * Fetches and maps validators with user data.
 * @returns {Promise<Object[]>} The mapped validators data.
 */
const fetchValidatorsAndMapTele = async () => {
  try {
    const { data } = await axios.get(process.env.VALIDATOR_API);
    const userValidators = await readValidatorsFromFile();
    const userValidatorsMaped = Object.entries(userValidators).map(([id, operatorAddress]) => ({ id, operatorAddress }));

    return data.map((validator) => {
      const user = userValidatorsMaped.find((d) => d.operatorAddress === validator.operatorAddress);
      return { ...validator, user: user ?? null };
    });
  } catch (error) {
    console.error("Error fetching or mapping validators:", error);
    return [];
  }
};

/**
 * Fetches active validators based on ranks.
 * @param {Object[]} allValidators - All validators data.
 * @returns {Object[]} The active validators.
 */
const fetchValidatorsAndMapTeleActive = (allValidators) => {
  const seenRanks = new Set();

  return allValidators
    .filter((obj) => obj.rank >= 1 && obj.rank <= 100)
    .filter((obj) => {
      if (seenRanks.has(obj.rank)) return false;
      seenRanks.add(obj.rank);
      return true;
    })
    .sort((a, b) => a.rank - b.rank);
};

/**
 * Gets promoted and demoted validators.
 * @param {Object[]} activeValidators - Active validators data.
 */
const getPromotedAndDemotedValidators = async (activeValidators) => {
  const demotedValidators = activeValidatorsOrigin.filter((originValidator) => {
    return !activeValidators.some((validator) => validator.operatorAddress === originValidator.operatorAddress);
  });

  const promotedValidators = activeValidators.filter((validator) => {
    return !activeValidatorsOrigin.some((originValidator) => validator.operatorAddress === originValidator.operatorAddress);
  });

  const demotedPromises = demotedValidators.map(({ user }) => {
    if (user) return bot.sendMessage(user.id, MESSAGES.VALIDATOR_DEACTIVATED);
  });

  const promotedPromises = promotedValidators.map(({ user }) => {
    if (user) return bot.sendMessage(user.id, MESSAGES.VALIDATOR_ACTIVATED);
  });

  await Promise.all([...demotedPromises, ...promotedPromises]);
};

/**
 * Gets jailed and unjailed validators.
 * @param {Object[]} allValidators - All validators data.
 */
const getJailedAndUnjailedValidators = async (allValidators) => {
  const jailedValidators = allValidatorsOrigin.filter((originValidator) => {
    const matchingValidator = allValidators.find((validator) => validator.operatorAddress === originValidator.operatorAddress);
    return matchingValidator && matchingValidator.jailed === true && originValidator.jailed === false;
  });

  const unJailedValidators = allValidators.filter((validator) => {
    const matchingOriginValidator = allValidatorsOrigin.find((originValidator) => validator.operatorAddress === originValidator.operatorAddress);
    return matchingOriginValidator && matchingOriginValidator.jailed === true && validator.jailed === false;
  });

  const jailedPromises = jailedValidators.map(({ user }) => {
    if (user) return bot.sendMessage(user.id, MESSAGES.VALIDATOR_JAILED);
  });

  const unJailedPromises = unJailedValidators.map(({ user }) => {
    if (user) return bot.sendMessage(user.id, MESSAGES.VALIDATOR_RELEASED);
  });

  await Promise.all([...jailedPromises, ...unJailedPromises]);
};

/**
 * Fetches validator user information.
 * @param {string} chatId - The chat ID to send the message.
 * @param {string} address - The validator address to fetch information for.
 */
const fetchValidatorUser = async (chatId, address) => {
  try {
    const [blockHeight, blockInfo] = await Promise.all([
      // axios.get(`${process.env.VALIDATOR_USER_API}${address}.json`),
      axios.get(`${process.env.HEIGHT_USER_API}${address}`),
      axios.get(process.env.INFO_API),
    ]);

    const isActiveAddress = activeValidatorsOrigin.find((v) => v.operatorAddress === address)

    const message =
      `📊 *Uptime*: ${(isActiveAddress ? Number(blockHeight.data.uptime?.windowUptime?.uptime ?? 0) : 0)*100}%\n` +
      `🚫 *Jailed*: ${Boolean(blockHeight.data.jailed) ? "Yes" : "No"}\n` +
      `💰 *Tokens*: ${blockHeight.data.tokens}\n` +
      `📏 *Last Synced Block Height*: ${Number(blockHeight.data.uptime?.historicalUptime?.lastSyncHeight ?? 0)}\n` +
      `🔗 *Chain Block Height*: ${blockInfo.data[0].height}\n` +
      `📉 *Height Difference from Chain*: ${Number(blockInfo.data[0].height) - Number(blockHeight.data.uptime?.historicalUptime?.lastSyncHeight ?? 0)}`;

    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error("Error fetching or mapping validators:", error);
  }
};

bot.on("message", async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;

  if (text === "/start" || text === "/check") return;

  const userValidators = await readValidatorsFromFile();
  const validatorAddress = userValidators[chatId];

  if (!validatorAddress) {
    if (isValidValidatorAddress(text)) {
      userValidators[chatId] = text;
      await saveValidatorsToFile(userValidators);
      return await bot.sendMessage(chatId, MESSAGES.VALIDATOR_ADDRESS_SAVED);
    } else {
      return await bot.sendMessage(chatId, MESSAGES.INVALID_VALIDATOR_ADDRESS);
    }
  }

  await bot.sendMessage(chatId, MESSAGES.INVALID_ACTION_ERROR);
});

bot.onText(/\/start|\/check/, async (msg) => {
  const chatId = msg.chat.id;
  const userValidators = await readValidatorsFromFile();
  const validatorAddress = userValidators[chatId];

  const text = msg.text.toLowerCase();
  switch (text) {
    case "/start":
      if (validatorAddress) {
        await bot.sendMessage(chatId, MESSAGES.STARTED_CHECKING);
        return;
      }
      await bot.sendMessage(chatId, MESSAGES.PROMPT_VALIDATOR_ADDRESS);
      break;
    case "/check":
      if (validatorAddress) {
        await bot.sendMessage(chatId, MESSAGES.CHECKING_VALIDATOR_STATUS);
        await fetchValidatorUser(chatId, validatorAddress);
        return;
      }
      await bot.sendMessage(chatId, MESSAGES.MISSING_VALIDATOR_ADDRESS);
      break;
    default:
      await bot.sendMessage(chatId, MESSAGES.INVALID_ACTION_ERROR);
  }
});

/**
 * Main loop to fetch and process validators continuously.
 */
const loop = async () => {
  const allValidators = await fetchValidatorsAndMapTele();
  const activeValidators = fetchValidatorsAndMapTeleActive(allValidators);

  if(mounted) {
    await getPromotedAndDemotedValidators([...activeValidators]);
    await getJailedAndUnjailedValidators([...allValidators]);
  }

  allValidatorsOrigin = [...allValidators];
  activeValidatorsOrigin = [...activeValidators];
  mounted = true
  loop();
};

loop()