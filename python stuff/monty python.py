# program to ask your name and then greet you, and then ask you some questions, then play a game.
import random
import time
print('Hello.')
print('What is your name?')
myname = input()
if myname == 'Efton':
    print('hello Efton, the creator of this program.')
print('It is good to meet you, ' + myname + '. ' + 'My name is Monty Python.')
print('brownies or cookies? ')
answer = ' '
answer1 = 'brownies'
answer2 = 'cookies'

while answer != answer1 and answer != answer2 and answer != 'skip':
    answer = input().lower()
    if  answer == answer1:
        print('I agree, ' + myname + '. Brownies are a lot better than cookies!')
    elif  answer == answer2:
        print('I disagree, ' + myname + '. Brownies taste better!')
    else:
        print('Error message! ' + 'what is a ' + answer +'?')
        time.sleep(0.5)
        print('please type again')
        
print('phones, or computers?')
Answer1 = 'phones'
Answer2 = 'computers'
Answer = ' '

while Answer != Answer1 and Answer != Answer2 and answer != 'skip':
    Answer = input().lower()
    if Answer == Answer1:
        print('I disagree, ' + myname + '. computers are better!')
    elif Answer == Answer2:
        print('I agree, ' + myname + '. computers are more powerful than phones!')
    else:
        print('I am sorry, but what is a ' + Answer + '?')
        time.sleep(0.5)
        print('choose again please')
        
print('Ok, ' + myname + '. cheese or chocolate?')
choice = ' '
chocolate = 'chocolate'
cheese = 'cheese'

while choice != chocolate and choice != cheese and answer != 'skip':
    choice = input().lower()
    if choice == chocolate:
        print('I agree, ' + myname + '. chocolate is yummier than cheese!')
    elif choice == cheese:
        print('I disagree, ' + myname + '. chocolate tastes better!')
    else:
        print('what is a ' + choice + '?')
        time.sleep(0.5)
        print('choose again please')
playagain = True
        
guessestaken = 0
while playagain == True and answer != 'skip':
    print('Ok, now lets play a little game, ' + myname + '.')
    number = random.randint(1, 100)
    print('I am thinking of a number between 1 and 100')
    while guessestaken < 7:
        print('take a guess, ' + myname + '.')
        guess = input()
        guess = int(guess)
        guessestaken = guessestaken + 1
        if guess < number:
            print('too low, ' + myname + '!')
        if guess > number:
            print('too high, ' + myname + '!')
        if guess == number:
            break
    if guess == number:
        guessestaken = str(guessestaken)
        print(f'good job, {myname}. you guessed my number in {str(guessestaken)} guesses!')
    if guess != number:
        number = number
        print(f'aw dang, {myname}. you couldnt guess {str(number)} in 7 or less guesses!')
    print('Now, ' + myname + ',')
    time.sleep(1)
    print('Pick a number from 1-100, then type done')
    x = 50
    y = 25
    guess = 1
    done = input()
    if done == 'done':
        response = ''
        while response != 'correct':
            print('Is your number...')
            time.sleep(1.5)
            print(str(x) + '?')
            response = input().lower()
            if response == 'higher':
                guess += 1
                x = x + y
                y = y // 2
                y = max(y, 1)
            elif response == 'lower':
                guess += 1
                x = x - y
                y = y // 2
                y = max(y, 1)
            elif response == 'correct':
                break
            else:
                print('to answer me, instead of typing ' + response + ', type higher, lower, or correct, to hint me on the number.')
    print('I guessed your number in... ')
    time.sleep(1.5)
    print(str(guess) + ' guesses!')
    print('play again guessing games? (both you guess and I guess) yes or noes. if noes, onto next game.')
    playagain = input().lower()
    if playagain == 'yes':
        playagain = True
    else:
        break
print('the number quintiples each second every second.')
print('would you like to watch it quintiple? it starts at 12.')
x = input()
if x == 'yes' or x == 'y':
    kaboom = 12
    num = 0
    while kaboom != 24:
        print('kaboom is equal to ' + str(kaboom))
        kaboom *= 5
        time.sleep(1)
        num += 1
        if num >= 10:
            print('keep going?')
            xy = input()
            if xy == 'yes' or xy == 'y':
                num = 0
            else:
                print('ok')
                num = None
                break
else:
    print('ok, bye!')
    time.sleep(2)

# Start the player with some fake money
wallet = 20000

print(f"\nWelcome to the Dice roller, {myname}!")
print(f"You have ${wallet}. Let's see if you can double it.")

while wallet > 0:
    print(f"\nYou have ${wallet}. How much do you want to bet?")
    
    try:
        bet = int(input("Bet amount (or 0 to quit): "))
        
        if bet == 0:
            print("Coward! Just kidding. See ya later!")
            break
        
        if bet > wallet:
            print("You don't have that much money!")
            continue

        print("Shaking the dice...")
        time.sleep(1.5)

        # Roll two 6-sided dice
        die1 = random.randint(1, 6)
        die2 = random.randint(1, 6)
        total = die1 + die2

        print(f"--- {die1} and {die2} ---")
        print(f"Total is: {total}")

        # Win logic: Win on 7 or 11, or if both dice are the same (doubles)
        if int(total) in [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]:
            wallet += bet
            print(f"You won! You now have ${wallet}.")
        else:
            wallet -= bet
            print(f"Bad luck! You lost ${bet}.")
            
        if wallet <= 0:
            print("You're broke! Game over.")
            break

        print("Play another round? (y/n)")
        again = input().lower().strip()
        if again != 'y':
            break

    except ValueError:
        print("Please type a number for your bet!")

print(f"You walked away with ${wallet}. Thanks for playing!")

