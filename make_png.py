from PIL import Image, ImageDraw, ImageFont

# Create image
width, height = 900, 700
img = Image.new('RGB', (width, height), '#ffffff')
draw = ImageDraw.Draw(img)

# Border
draw.rounded_rectangle([5, 5, width-5, height-5], radius=30, outline='#00bcd4', width=10)

# Load fonts
try:
    font_title = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 42)
    font_ice = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 72)
    font_flavors = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 24)
    font_item = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
except:
    font_title = ImageFont.load_default()
    font_ice = ImageFont.load_default()
    font_flavors = ImageFont.load_default()
    font_item = ImageFont.load_default()

# Title box
draw.rounded_rectangle([400, 40, 620, 120], radius=40, fill='#00bcd4')
draw.text((510, 80), 'Shredded', font=font_title, fill='#ffffff', anchor='mm')

# ICE
draw.text((450, 240), 'ICE', font=font_ice, fill='#00838f', anchor='mm')

# Flavors box (teal gradient)
for y in range(300, 620):
    r = 0
    g = int(188 - (188-135) * ((y-300) / 320))
    b = int(212 - (212-143) * ((y-300) / 320))
    draw.line([(300, y), (600, y)], fill=(r, g, b))

# Flavors title
draw.text((450, 340), 'Flavors', font=font_flavors, fill='#ffffff', anchor='mm')
draw.line([(330, 355), (570, 355)], fill='#88ccdd', width=2)

# Flavor items
flavors = ['Grappling Hook Grape', 'Amazing Apple', 'Strong Strawberry', 'Perfect Pineapple', 
           'Delicious Dragonfruit', 'Chunky Chocolate', 'Crazy Cranberry', 'Barbell Blueberry']
y = 390
for f in flavors:
    draw.rounded_rectangle([320, y-20, 580, y+10], radius=15, fill='#44aaaa')
    draw.text((450, y-5), f, font=font_item, fill='#ffffff', anchor='mm')
    y += 42

# Order section
draw.text((450, 640), 'Place Your Order Here', font=font_flavors, fill='#00838f', anchor='mm')
draw.rounded_rectangle([350, 660, 550, 705], radius=25, fill='#00bcd4')
draw.text((450, 682), 'Order Now', font=font_flavors, fill='#ffffff', anchor='mm')

img.save('/Users/efton/projects/shredded_ice_sign.png')
print('Created shredded_ice_sign.png')