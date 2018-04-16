import { ConversationState, MemoryStorage, ConsoleAdapter, TurnContext } from 'botbuilder';
import { DialogSet, NumberPrompt, DialogContext } from 'botbuilder-dialogs';

interface GuessingState {
    correctNumber: number;
    numberOfGuesses: number;
}

const stateManager = new ConversationState<GuessingState>(new MemoryStorage());

const adapter = new ConsoleAdapter();
adapter.use(stateManager);

adapter.listen(async (context) => {
    if(context.activity.type !== 'message') return;

    const utterance = context.activity.text;
    const dialogContext = dialogs.createContext(context, stateManager.get(context));

    if(utterance.includes('start')) {
        // reset
        await dialogContext.endAll();
        // begin the game
        await dialogContext.begin('run-game');
    } else if(utterance.includes('help')) {
        // run help command
        await dialogContext.begin('help');
    } else {
        // pass value to current dialog
        await dialogContext.continue();

        // no dialogs took the value, run help
        if(!context.responded) await dialogContext.begin('help');
    }

});

const dialogs = new DialogSet();

dialogs.add('run-game', [
    async(dialogContext, lastGuess: number = null) => {
        const state = stateManager.get(dialogContext.context) as GuessingState;

        if(!lastGuess) {
            // first run
            // initialize values
            state.numberOfGuesses = 0;
            state.correctNumber = 4;

            // prompt the user
            await dialogContext.prompt('get-number', `Guess a number between 0 and 10`);
        } else if(lastGuess !== state.correctNumber) {
            state.numberOfGuesses++;
            if(state.numberOfGuesses >= 3) {
                await dialogContext.context.sendActivity(`Sorry, you ran out of guesses.`);
                await dialogContext.context.sendActivity(`The number was ${state.correctNumber}`);
                await dialogContext.endAll();
            } else {
                const adjective = lastGuess < state.correctNumber ? 'higher' : 'lower';
                await dialogContext.prompt('get-number', `Sorry, that's not right. Try a ${adjective} number.`);
            }
        } else {
            // correct!!
            await dialogContext.context.sendActivity(`Congratulations!! You're right!!`);
            dialogContext.endAll();
        }
    }
])

dialogs.add('get-number', new NumberPrompt(async (context, value) => {
    if(value < 0 || value > 10) {
        await context.sendActivity(`The number is between 0 and 10. This won't count as a guess. Please try again!`);
        return undefined;
    } else {
        const dialogContext = dialogs.createContext(context, stateManager.get(context));
        dialogContext.replace('run-game', value);
    }
}));

dialogs.add('help', [
    async (dialogContext) => {
        await dialogContext.context.sendActivity(`This is a number guessing game. Say "start" to start the game.`);
    }
]);