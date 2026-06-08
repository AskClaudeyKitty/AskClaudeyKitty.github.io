"""Draw a pelican riding a bicycle with Python's turtle module.

Run with:
    python3 pelican_bicycle.py
"""

import turtle
import math

# ── Setup ──
screen = turtle.Screen()
screen.title("Pelican on a Bicycle")
screen.bgcolor("sky blue")

t = turtle.Turtle()
t.speed(0)        # 0 = fastest animation, no per-segment delay
t.hideturtle()
t.pensize(2)


def go(x, y):
    t.penup()
    t.goto(x, y)
    t.pendown()


def arc(radius, extent):
    """Draw an arc with the given radius and extent (degrees)."""
    t.circle(radius, extent)


# ── Bicycle ──
WHEEL_R = 60
REAR_HUB = (-120, -60)
FRONT_HUB = (120, -60)


def wheel(hx, hy):
    go(hx, hy - WHEEL_R)
    t.circle(WHEEL_R)
    # Spokes
    for angle in range(0, 360, 45):
        rad = math.radians(angle)
        x1 = hx + math.cos(rad) * 8
        y1 = hy + math.sin(rad) * 8
        x2 = hx + math.cos(rad) * (WHEEL_R - 6)
        y2 = hy + math.sin(rad) * (WHEEL_R - 6)
        go(x1, y1)
        t.goto(x2, y2)


wheel(*REAR_HUB)
wheel(*FRONT_HUB)

# Hubs
for hx, hy in (REAR_HUB, FRONT_HUB):
    go(hx, hy - 6)
    t.begin_fill()
    t.circle(6)
    t.end_fill()

# Frame: rear hub -> seat post -> handlebar -> front hub (triangle + bar)
go(REAR_HUB[0], REAR_HUB[1])
t.goto(-20, 20)      # top of seat tube
t.goto(FRONT_HUB[0], FRONT_HUB[1])  # down to front hub
t.goto(-20, 20)      # back up to seat tube top
t.goto(40, 40)       # handlebars
t.goto(60, FRONT_HUB[1] + 30)  # fork to front hub top
t.goto(FRONT_HUB[0], FRONT_HUB[1])

# Pedals
go(-20, 20)
t.goto(-50, -10)     # crank arm
go(-50, -10)
t.begin_fill()
t.circle(8)
t.end_fill()
go(-50, -10)
t.goto(10, 50)       # other crank arm
go(10, 50)
t.begin_fill()
t.circle(8)
t.end_fill()

# Seat
go(-50, 25)
t.begin_fill()
t.goto(-10, 25)
t.goto(-10, 35)
t.goto(-50, 35)
t.goto(-50, 25)
t.end_fill()

# Handlebars
go(60, FRONT_HUB[1] + 30)
t.goto(60, 60)
go(60, 60)
t.goto(45, 75)
go(45, 75)
t.goto(75, 75)

# ── Pelican (perched on the seat, legs reaching to pedals) ──
# Body
go(0, 30)
t.begin_fill()
arc(50, 180)
t.goto(0, 30)
t.end_fill()

# Tail feathers
go(0, 35)
t.begin_fill()
t.goto(-55, 50)
t.goto(-45, 30)
t.goto(-30, 35)
t.goto(0, 30)
t.end_fill()

# Wing
go(10, 45)
t.begin_fill()
t.goto(40, 70)
t.goto(20, 75)
t.goto(-5, 55)
t.goto(10, 45)
t.end_fill()

# Neck
go(50, 50)
t.begin_fill()
t.goto(70, 90)
t.goto(80, 90)
t.goto(60, 50)
t.end_fill()

# Head
go(80, 90)
t.begin_fill()
arc(20, 360)
t.end_fill()

# Eye
go(90, 100)
t.begin_fill()
t.circle(3)
t.end_fill()

# Upper beak (the iconic pelican pouch)
go(100, 95)
t.begin_fill()
t.goto(150, 100)
t.goto(150, 92)
t.goto(100, 88)
t.goto(100, 95)
t.end_fill()

# Pouch
go(100, 88)
t.begin_fill()
t.goto(150, 92)
t.goto(135, 75)
t.goto(110, 78)
t.goto(100, 88)
t.end_fill()

# Legs (from body down to pedals)
go(-10, 25)
t.goto(-20, 15)
t.goto(-50, -10)     # to rear pedal
go(20, 25)
t.goto(20, 30)
t.goto(10, 50)       # to front pedal

# Feet
go(-50, -10)
t.begin_fill()
t.circle(6)
t.end_fill()
go(10, 50)
t.begin_fill()
t.circle(6)
t.end_fill()

# Tuft on top of head
go(85, 110)
t.goto(82, 120)
t.goto(88, 115)
t.goto(85, 125)
t.goto(90, 118)
t.goto(95, 122)

screen.mainloop()
