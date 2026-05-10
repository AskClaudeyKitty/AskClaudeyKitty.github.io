from time import *
yess = True
while yess != False:
    choice = ' '
    while choice == ' ':
        print('rock, paper, or scissors?')
        choice = input()  # Fixed: = instead of ==
        if choice == 'rock':
            print('paper! you lose!')
        elif choice == 'paper':
            print('scissors! you lose!')
        elif choice == 'scissors':
            print('rock! you lose!')
        else:
            print(f'I am sorry, but what is a {choice}? the choices are rock paper or scissors.')
            choice = ' '
            continue  # Skip the play again prompt if invalid choice
    print('play again? yes or no.')
    yess = input()
    if yess != 'yes' and yess != 'y':  
        print('goodbye I guess loser.')
        sleep(1)
        yess = False
    else:
        print(f'ok, get ready to lose again!')
        sleep(1)
        choice = ' '  # Reset choice for next round
