const MESSAGES = {
  MISSING_VALIDATOR_ADDRESS:
    "🔄 *Validator Address Missing:* You haven't entered a validator address. Please enter your validator address (must start with 'storyvaloper1').",
  PROMPT_VALIDATOR_ADDRESS:
    "📩 *Validator Address Required:* Please enter your validator address (must start with 'storyvaloper1').",
  INVALID_VALIDATOR_ADDRESS:
    "❌ *Invalid Validator Address:* The address you entered is invalid. Please provide an address starting with 'storyvaloper1' and 51 characters long.",
  VALIDATOR_ADDRESS_SAVED:
    "✅ *Success:* Validator address saved! You can now type `/check` to check your validator status.",
  INVALID_ACTION_ERROR: "❌ *Error:* This action is not permitted.",
  CHECKING_VALIDATOR_STATUS: "⏳ *Checking Status:* Retrieving information for your validator...",
  STARTED_CHECKING: "🚀 *Started:* You have successfully started the process. Let's begin checking your information!",
  VALIDATOR_ACTIVATED: "🟢 *Validator Status Update:* Your validator has transitioned from inactive to active.",
  VALIDATOR_DEACTIVATED: "🔴 *Validator Status Update:* Your validator has transitioned from active to inactive.",
  VALIDATOR_JAILED: "🚫 *Jailed:* Your validator has been jailed.",
  VALIDATOR_RELEASED: "✅ *Released:* Your validator has been successfully released from jail.",
};

module.exports = MESSAGES;