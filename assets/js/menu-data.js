/* ==========================================================================
   UMBRELLA CAFE — ELLA, SRI LANKA
   Full menu data set · prices in LKR · localised in EN / FR / RU / DE
   "The Umbrella Ella Roti & Kottu Hub"
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- helper */
  // n(name-en, name-fr, name-ru, name-de)
  function n(en, fr, ru, de) { return { en: en, fr: fr, ru: ru, de: de }; }

  var IMG = 'assets/img/dishes/';

  /* ------------------------------------------------------------ categories */
  var categories = [
    { id: 'roti',       emoji: '🫓', n: n('Signature Roti', 'Rotis Signature', 'Фирменные Роти', 'Signature Roti'), img: 'roti-veg.jpg',      blurb: n('Traditional Sri Lankan flatbread, freshly griddled and served with savoury fillings.', 'Pain plat sri-lankais traditionnel, grillé à la minute et garni de savoureuses farces.', 'Традиционная шри-ланкийская лепёшка, свежая с гриля, с сытными начинками.', 'Traditionelles sri-lankisches Fladenbrot, frisch gebraten und mit herzhaften Füllungen serviert.') },
    { id: 'kottu',      emoji: '🍲', n: n('Kottu Junction', 'Kottu Junction', 'Котту Джанкшн', 'Kottu Junction'), img: 'kottu-special.jpg', blurb: n('A legendary Sri Lankan stir-fry of shredded flatbread, fresh veggies, eggs and spices — chopped to perfection with a rhythmic beat!', 'Le légendaire sauté sri-lankais de pain plat émincé, légumes frais, œufs et épices — haché à la perfection en rythme !', 'Легендарная шри-ланкийская жареная смесь из рубленой лепёшки, свежих овощей, яиц и специй — нарубленная до совершенства под ритмичный стук!', 'Die legendäre sri-lankische Bratpfanne aus zerkleinertem Fladenbrot, frischem Gemüse, Eiern und Gewürzen — im Rhythmus perfekt gehackt!') },
    { id: 'main',       emoji: '🍛', n: n('Main Dish', 'Plats Principaux', 'Основные Блюда', 'Hauptgerichte'), img: 'rice-curry.jpg' },
    { id: 'chopsey',    emoji: '🥘', n: n('Chop Suey', 'Chop Suey', 'Чоп-суи', 'Chop Suey'), img: 'chopsey.jpg' },
    { id: 'soup',       emoji: '🍜', n: n('Soup', 'Soupes', 'Супы', 'Suppen'), img: 'soup.jpg' },
    { id: 'starters',   emoji: '🍗', n: n('Stews & Starters', 'Entrées & Encas', 'Закуски и Стартеры', 'Snacks & Starter'), img: 'starters.jpg' },
    { id: 'omelette',   emoji: '🍳', n: n('Omelette', 'Omelettes', 'Омлеты', 'Omeletts'), img: 'omelette.jpg' },
    { id: 'boiled',     emoji: '🥦', n: n('Boiled Vegetables', 'Légumes Bouillis', 'Отварные Овощи', 'Gekochtes Gemüse'), img: 'boiled-veg.jpg' },
    { id: 'pancakes',   emoji: '🥞', n: n('Pancakes', 'Pancakes', 'Панкейки', 'Pancakes'), img: 'pancakes.jpg' },
    { id: 'sweet',      emoji: '🍨', n: n('Sweet Corner', 'Coin Sucré', 'Сладкий Уголок', 'Süsse Ecke'), img: 'fruit-salad.jpg' },
    { id: 'icecream',   emoji: '🍦', n: n('Ice Cream', 'Glaces', 'Мороженое', 'Eiscreme'), img: 'icecream.jpg' },
    { id: 'juice',      emoji: '🥤', n: n('Fresh Juice', 'Jus Frais', 'Свежие Соки', 'Frische Säfte'), img: 'juice.jpg' },
    { id: 'lassi',      emoji: '🥛', n: n('Lassie', 'Lassi', 'Ласси', 'Lassi'), img: 'lassi.jpg' },
    { id: 'milkshake',  emoji: '🍹', n: n('Milkshake', 'Milkshakes', 'Молочные Коктейли', 'Milchshakes'), img: 'milkshake.jpg' },
    { id: 'tea',        emoji: '☕', n: n('Tea & Coffee', 'Thé & Café', 'Чай и Кофе', 'Tee & Kaffee'), img: 'tea.jpg' },
    { id: 'iced',       emoji: '🧊', n: n('Ice Tea & Ice Coffee', 'Thé & Café Glacés', 'Айс Ти и Айс Кофе', 'Eistee & Eiskaffee'), img: 'iced-drinks.jpg' },
    { id: 'softdrinks', emoji: '🥫', n: n('Soft Drinks', 'Boissons Gazeuses', 'Прохладительные Напитки', 'Softdrinks'), img: 'soft-drinks.jpg' }
  ];

  /* ------------------------------------------------------- reusable pieces */
  var VEGGIES = n('Carrot, leeks, cabbage, beans', 'Carotte, poireaux, chou, haricots', 'Морковь, порей, капуста, фасоль', 'Karotten, Lauch, Kohl, Bohnen');
  var CHEESE_TOMATO = n('Tomato, cheese, onion, bell pepper', 'Tomate, fromage, oignon, poivron', 'Помидор, сыр, лук, болгарский перец', 'Tomate, Käse, Zwiebel, Paprika');

  var ADDON_CHICKEN = { id: 'addon-chicken-curry',  price: 550, emoji: '🍗', n: n('Add-on: Chicken Curry', 'Supplément : curry de poulet', 'Добавка: куриное карри', 'Extra: Hühner-Curry') };
  var ADDON_JACKFRUIT = { id: 'addon-jackfruit', price: 550, emoji: '🥭', n: n("Add-on: Baby Jackfruit Curry", 'Supplément : curry de jeune jacque', 'Добавка: карри из молодого джекфрута', 'Extra: Baby-Jackfruit-Curry') };

  /* small/large pot option set (tea & coffee) */
  function pot(small, big) {
    return [
      { id: 'small', price: small, n: n('Small pot', 'Petit pot', 'Маленький чайник', 'Kleine Kanne') },
      { id: 'big',   price: big,   n: n('Big pot', 'Grand pot', 'Большой чайник', 'Grosse Kanne') }
    ];
  }

  /* ---------------------------------------------------------------- items */
  var items = [
    /* ── 🫓 SIGNATURE ROTI ─────────────────────────────────────────────── */
    { id: 'roti-green', cat: 'roti', price: 900, img: 'roti-veg.jpg', emoji: '🥕', tags: ['veg'],
      n: n("Ella Green Garden (Veg Roti)", 'Jardin Vert d’Ella (Roti végétarien)', 'Зелёный Сад Элла (овощной роти)', 'Ella Green Garden (Gemüse-Roti)'),
      d: VEGGIES },
    { id: 'roti-adams-peak', cat: 'roti', price: 1100, img: 'roti-cheese.jpg', emoji: '🧀', tags: ['veg', 'cheese'],
      n: n("Little Adam's Peak Special (Cheese Tomato)", 'Spécial Little Adam’s Peak (fromage & tomate)', 'Спешиал Литл-Адамс-Пик (сыр и помидор)', 'Little Adam’s Peak Special (Käse-Tomate)'),
      d: CHEESE_TOMATO },
    { id: 'roti-mushroom', cat: 'roti', price: 1100, img: 'roti-mushroom.jpg', emoji: '🍄', tags: ['veg'],
      n: n('Wild Mushroom Roti (Veg Mushroom)', 'Roti aux champignons sauvages', 'Роти с дикими грибами', 'Wild Mushroom Roti (Gemüse & Pilze)'),
      d: n('Carrot, leeks, cabbage, beans, fresh mushrooms', 'Carotte, poireaux, chou, haricots, champignons frais', 'Морковь, порей, капуста, фасоль, свежие грибы', 'Karotten, Lauch, Kohl, Bohnen, frische Champignons') },
    { id: 'roti-nine-arch', cat: 'roti', price: 1200, img: 'roti-hawaiian.jpg', emoji: '🍍', tags: ['veg', 'cheese'],
      n: n('Nine Arch Tropical Roti (Hawaiian Style)', 'Roti Tropical Nine Arch (style hawaïen)', 'Тропический роти Найн-Арч (гавайский стиль)', 'Nine Arch Tropical Roti (Hawaii-Style)'),
      d: n('Tomato, cheese, onion, pineapple', 'Tomate, fromage, oignon, ananas', 'Помидор, сыр, лук, ананас', 'Tomate, Käse, Zwiebel, Ananas') },
    { id: 'roti-chicken', cat: 'roti', price: 1200, img: 'roti-chicken.jpg', emoji: '🍗', tags: ['chicken'], popular: true,
      n: n('Ella Rock Chicken Roti (Chicken Mushroom)', 'Roti au poulet Ella Rock (poulet & champignons)', 'Куриный роти Элла-Рок (курица и грибы)', 'Ella Rock Chicken Roti (Huhn & Pilze)'),
      d: n('Carrot, leeks, cabbage, beans, chicken', 'Carotte, poireaux, chou, haricots, poulet', 'Морковь, порей, капуста, фасоль, курица', 'Karotten, Lauch, Kohl, Bohnen, Huhn') },
    { id: 'roti-ravana', cat: 'roti', price: 1300, img: 'roti-sausage.jpg', emoji: '🌭', tags: ['cheese'], popular: true,
      n: n("Ravana's Cheesy Treat (Cheese Sausage)", 'Gourmandise de Ravana (fromage & saucisse)', 'Сырное удовольствие Раваны (сыр и колбаски)', 'Ravana’s Cheesy Treat (Käse & Wurst)'),
      d: n('Tomato, cheese, onion, bell pepper, sausage', 'Tomate, fromage, oignon, poivron, saucisse', 'Помидор, сыр, лук, болгарский перец, колбаски', 'Tomate, Käse, Zwiebel, Paprika, Wurst') },

    /* ── 🍲 KOTTU JUNCTION ─────────────────────────────────────────────── */
    { id: 'kottu-veg', cat: 'kottu', price: 1200, img: 'kottu-veg.jpg', emoji: '🥬', tags: ['veg'],
      n: n('Misty Mountain Veggie (Veg Kottu)', 'Veggie des Montagnes Brumeuses (kottu végétarien)', 'Туманный Горный Вегги (овощной котту)', 'Misty Mountain Veggie (Gemüse-Kottu)'),
      d: VEGGIES },
    { id: 'kottu-mushroom', cat: 'kottu', price: 1300, img: 'kottu-mushroom.jpg', emoji: '🍄', tags: ['veg'],
      n: n('Highland Mushroom Kottu (Veg Mushroom)', 'Kottu aux champignons des hauts plateaux', 'Горный котту с грибами', 'Highland Mushroom Kottu (Gemüse & Pilze)'),
      d: n('Carrot, leeks, cabbage, beans, mushrooms', 'Carotte, poireaux, chou, haricots, champignons', 'Морковь, порей, капуста, фасоль, грибы', 'Karotten, Lauch, Kohl, Bohnen, Champignons') },
    { id: 'kottu-chicken-egg', cat: 'kottu', price: 1600, img: 'kottu-chicken.jpg', emoji: '🍳', tags: ['chicken'], popular: true,
      n: n('The Ella Express (Chicken Egg Kottu)', 'L’Ella Express (kottu poulet & œuf)', 'Элла Экспресс (котту с курицей и яйцом)', 'The Ella Express (Huhn-Ei-Kottu)'),
      d: n('Carrot, leeks, cabbage, beans, chicken, egg', 'Carotte, poireaux, chou, haricots, poulet, œuf', 'Морковь, порей, капуста, фасоль, курица, яйцо', 'Karotten, Lauch, Kohl, Bohnen, Huhn, Ei') },
    { id: 'kottu-special', cat: 'kottu', price: 1900, img: 'kottu-special.jpg', emoji: '💥', tags: ['chicken', 'chef'], popular: true, signature: true,
      n: n('Umbrella Ultimate Legend (Special Kottu)', 'Légende Ultime Umbrella (kottu spécial)', 'Амбрелла Ультимейт Легенда (спешиал котту)', 'Umbrella Ultimate Legend (Special Kottu)'),
      d: n('Carrot, leeks, cabbage, beans, chicken, egg, mushrooms, sausage', 'Carotte, poireaux, chou, haricots, poulet, œuf, champignons, saucisse', 'Морковь, порей, капуста, фасоль, курица, яйцо, грибы, колбаски', 'Karotten, Lauch, Kohl, Bohnen, Huhn, Ei, Champignons, Wurst') },

    /* ── 🍛 MAIN DISH ──────────────────────────────────────────────────── */
    { id: 'main-rice-curry', cat: 'main', price: 1350, img: 'rice-curry.jpg', emoji: '🍛', tags: ['veg', 'vegan'], popular: true, signature: true,
      n: n('Sri Lankan Vegetable Rice & Curry (with 5 Curries)', 'Riz & curry de légumes sri-lankais (5 currys)', 'Шри-ланкийский овощной рис и карри (5 карри)', 'Sri-lankisches Gemüse-Reis & Curry (mit 5 Currys)'),
      d: n('Five home-style curries, papadam, pol sambol & lunu miris', 'Cinq currys maison, papadam, pol sambol & lunu miris', 'Пять домашних карри, пападам, пол самбол и луну мирис', 'Fünf hausgemachte Currys, Papadam, Pol Sambol & Lunu Miris'),
      addons: [ADDON_CHICKEN, ADDON_JACKFRUIT] },
    { id: 'main-coconut-roti', cat: 'main', price: 1350, img: 'coconut-roti.jpg', emoji: '🥥', tags: ['veg'], popular: true,
      n: n('Coconut Rotti (with dhal curry, coconut sambal, lunu miris)', 'Roti coco (curry de dhal, sambal coco, lunu miris)', 'Кокосовый ротти (дал-карри, кокосовый самбол, луну мирис)', 'Kokos-Rotti (mit Dhal-Curry, Kokos-Sambal, Lunu Miris)'),
      d: n('Thick coconut flatbread with three classic accompaniments', 'Pain plat épais à la noix de coco et trois accompagnements classiques', 'Толстая кокосовая лепёшка с тремя классическими добавками', 'Dickes Kokos-Fladenbrot mit drei klassischen Beilagen'),
      addons: [ADDON_CHICKEN, ADDON_JACKFRUIT] },
    { id: 'main-veg-fried-rice', cat: 'main', price: 1500, img: 'veg-fried-rice.jpg', emoji: '🍚', tags: ['veg'],
      n: n('Vegetable Fried Rice (Mushroom Deviled, Garlic Kankun & Chilli Paste)', 'Riz sauté aux légumes (champignons deviled, kankun à l’ail & pâte de piment)', 'Жареный рис с овощами (девилд грибы, чесночный канкун и чили-паста)', 'Gebratener Gemüsereis (Deviled-Pilze, Knoblauch-Kankun & Chilli-Paste)'),
      d: n('Wok-tossed rice with deviled mushrooms, garlic kankun and fiery chilli paste', 'Riz sauté au wok, champignons deviled, kankun à l’ail et pâte de piment', 'Рис с вок-овощами, девилд грибами, чесночным канкуном и острой чили-пастой', 'Im Wok geschwenkter Reis mit Deviled-Pilzen, Knoblauch-Kankun und scharfer Chilli-Paste') },
    { id: 'main-egg-fried-rice', cat: 'main', price: 1800, img: 'fried-rice.jpg', emoji: '🍳', tags: ['chicken'], popular: true,
      n: n('Egg Fried Rice (Chicken Deviled, Garlic Kankun & Chilli Paste)', 'Riz sauté à l’œuf (poulet deviled, kankun à l’ail & pâte de piment)', 'Жареный рис с яйцом (девилд курица, чесночный канкун и чили-паста)', 'Ei-Reis (Deviled-Huhn, Knoblauch-Kankun & Chilli-Paste)'),
      d: n('Golden egg fried rice with spicy deviled chicken, garlic kankun and chilli paste', 'Riz doré à l’œuf, poulet deviled épicé, kankun à l’ail et pâte de piment', 'Золотистый рис с яйцом, острой девилд курицей, чесночным канкуном и чили-пастой', 'Goldener Ei-Reis mit scharfem Deviled-Huhn, Knoblauch-Kankun und Chilli-Paste') },
    { id: 'main-pepper-chicken', cat: 'main', price: 1950, img: 'pepper-chicken.jpg', emoji: '⭐', tags: ['chicken', 'chef'], popular: true, signature: true,
      n: n("Ella Valley Pepper Chicken & Mash (Chef's Special)", 'Poulet au poivre de la vallée d’Ella & purée (spécialité du chef)', 'Перцовая курица долины Элла с пюре (спешиал от шефа)', 'Ella Valley Pepper Chicken & Mash (Spezialität des Küchenchefs)'),
      d: n('Cracked black pepper chicken in silky gravy with creamy mash', 'Poulet au poivre noir concassé, sauce soyeuse et purée crémeuse', 'Курица с дроблёным чёрным перцем в нежном соусе с кремовым пюре', 'Huhn mit grobem schwarzem Pfeffer in sämiger Sauce und cremigem Kartoffelpüree') },

    /* ── 🥘 CHOP SUEY ──────────────────────────────────────────────────── */
    { id: 'chopsey-veg', cat: 'chopsey', price: 1300, img: 'chopsey-veg.jpg', emoji: '🥦', tags: ['veg'],
      n: n('Vegetable Chop Suey', 'Chop suey de légumes', 'Овощной чоп-суи', 'Gemüse-Chop-Suey'),
      d: n('Glossy mixed vegetables in a light gravy over crispy noodles', 'Légumes variés nappés d’une sauce légère sur nouilles croustillantes', 'Смесь овощей в лёгком соусе на хрустящей лапше', 'Glänzendes Mischgemüse in leichter Sauce über knusprigen Nudeln') },
    { id: 'chopsey-chicken', cat: 'chopsey', price: 1600, img: 'chopsey.jpg', emoji: '🍗', tags: ['chicken'], popular: true,
      n: n('Chicken Chop Suey', 'Chop suey au poulet', 'Куриный чоп-суи', 'Hühner-Chop-Suey'),
      d: n('Tender chicken and garden vegetables in a savoury gravy', 'Poulet tendre et légumes du jardin dans une sauce savoureuse', 'Нежная курица и овощи в пикантном соусе', 'Zartes Huhn und Gartengemüse in würziger Sauce') },
    { id: 'chopsey-prawns', cat: 'chopsey', price: 1900, img: 'chopsey-prawns.jpg', emoji: '🍤', tags: ['prawns'],
      n: n('Prawns Chop Suey', 'Chop suey aux crevettes', 'Чоп-суи с креветками', 'Garnelen-Chop-Suey'),
      d: n('Juicy prawns wok-tossed with vegetables in a rich gravy', 'Crevettes juteuses sautées au wok avec légumes et sauce onctueuse', 'Сочные креветки с овощами в насыщенном соусе', 'Saftige Garnelen mit Gemüse im Wok, in reichhaltiger Sauce') },

    /* ── 🍜 SOUP ───────────────────────────────────────────────────────── */
    { id: 'soup-vegetable', cat: 'soup', price: 900, img: 'soup-veg.jpg', emoji: '🥕', tags: ['veg', 'vegan'],
      n: n('Vegetable Soup', 'Soupe de légumes', 'Овощной суп', 'Gemüsesuppe') },
    { id: 'soup-curry-leaves', cat: 'soup', price: 900, img: 'soup-curry-leaf.jpg', emoji: '🌿', tags: ['veg'],
      n: n('Curry Leaves Soup', 'Soupe aux feuilles de curry', 'Суп с листьями карри', 'Curryblatt-Suppe') },
    { id: 'soup-pumpkin', cat: 'soup', price: 900, img: 'soup.jpg', emoji: '🎃', tags: ['veg'], popular: true,
      n: n('Creamy Pumpkin Soup', 'Velouté de citrouille', 'Кремовый тыквенный суп', 'Cremige Kürbissuppe') },
    { id: 'soup-chicken', cat: 'soup', price: 900, img: 'soup-chicken.jpg', emoji: '🍗', tags: ['chicken'],
      n: n('Creamy Chicken Soup', 'Velouté de poulet', 'Кремовый куриный суп', 'Cremige Hühnersuppe') },
    { id: 'soup-sweet-corn', cat: 'soup', price: 900, img: 'soup-corn.jpg', emoji: '🌽', tags: ['veg'],
      n: n('Sweet Corn Soup', 'Soupe de maïs doux', 'Суп из сладкой кукурузы', 'Süssmais-Suppe') },
    { id: 'soup-chicken-egg-noodle', cat: 'soup', price: 1000, img: 'soup-noodle.jpg', emoji: '🍜', tags: ['chicken'], popular: true,
      n: n('Chicken Egg Noodle Soup', 'Soupe de nouilles au poulet et à l’œuf', 'Куриный суп с лапшой и яйцом', 'Huhn-Ei-Nudelsuppe') },

    /* ── 🍗 STEWS & STARTERS ───────────────────────────────────────────── */
    { id: 'starter-wings', cat: 'starters', price: 900, img: 'starters.jpg', emoji: '🍗', tags: ['chicken'], popular: true,
      n: n('Chicken Wings', 'Ailes de poulet', 'Куриные крылышки', 'Hähnchenflügel'),
      d: n('Crispy fried wings tossed in house spices', 'Ailes croustillantes enrobées d’épices maison', 'Хрустящие крылышки в фирменных специях', 'Knusprige Flügel mit hausgemachten Gewürzen') },
    { id: 'starter-wedges', cat: 'starters', price: 900, img: 'wedges.jpg', emoji: '🥔', tags: ['veg'],
      n: n('Potato Wedges', 'Quartiers de pommes de terre', 'Картофельные дольки', 'Kartoffel-Wedges'),
      d: n('Golden wedges served with a spicy dip', 'Quartiers dorés servis avec une sauce épicée', 'Золотистые дольки с острым соусом', 'Goldene Wedges mit scharfem Dip') },
    { id: 'starter-mushroom', cat: 'starters', price: 900, img: 'buttered-mushroom.jpg', emoji: '🍄', tags: ['veg'],
      n: n('Buttered Mushroom', 'Champignons au beurre', 'Грибы в масле', 'Butter-Champignons'),
      d: n('Fresh mushrooms sautéed in butter, garlic and herbs', 'Champignons frais sautés au beurre, ail et herbes', 'Свежие грибы, обжаренные в масле с чесноком и травами', 'Frische Champignons in Butter, Knoblauch und Kräutern') },
    { id: 'starter-papadam', cat: 'starters', price: 900, img: 'papadam.jpg', emoji: '🫓', tags: ['veg', 'spicy'],
      n: n('Masala Papadam', 'Papadam masala', 'Масала пападам', 'Masala-Papadam'),
      d: n('Crunchy papadam topped with onion, chilli and masala', 'Papadam croustillant, oignon, piment et masala', 'Хрустящий пападам с луком, чили и масалой', 'Knuspriges Papadam mit Zwiebeln, Chili und Masala') },

    /* ── 🍳 OMELETTE ───────────────────────────────────────────────────── */
    { id: 'om-cheese-tomato-onion', cat: 'omelette', price: 950, img: 'omelette.jpg', emoji: '🍅', tags: ['veg', 'cheese'],
      n: n('Omelette: Cheese, Tomato & Onion', 'Omelette fromage, tomate & oignon', 'Омлет: сыр, помидор и лук', 'Omelett: Käse, Tomate & Zwiebel') },
    { id: 'om-mushroom', cat: 'omelette', price: 1000, img: 'omelette-mushroom.jpg', emoji: '🍄', tags: ['veg', 'cheese'],
      n: n('Omelette: Cheese, Tomato, Onion & Mushroom', 'Omelette fromage, tomate, oignon & champignons', 'Омлет: сыр, помидор, лук и грибы', 'Omelett: Käse, Tomate, Zwiebel & Pilze') },
    { id: 'om-sausage', cat: 'omelette', price: 1000, img: 'omelette-sausage.jpg', emoji: '🌭', tags: ['cheese'],
      n: n('Omelette: Cheese, Tomato, Onion & Sausage', 'Omelette fromage, tomate, oignon & saucisse', 'Омлет: сыр, помидор, лук и колбаски', 'Omelett: Käse, Tomate, Zwiebel & Wurst') },
    { id: 'om-cheese-chicken', cat: 'omelette', price: 1050, img: 'omelette-chicken.jpg', emoji: '🍗', tags: ['chicken', 'cheese'],
      n: n('Omelette: Cheese & Chicken', 'Omelette fromage & poulet', 'Омлет: сыр и курица', 'Omelett: Käse & Huhn') },
    { id: 'om-umbrella-special', cat: 'omelette', price: 1100, img: 'omelette-special.jpg', emoji: '⭐', tags: ['chicken', 'cheese', 'chef'], popular: true, signature: true,
      n: n('Umbrella Special Omelette', 'Omelette Spéciale Umbrella', 'Фирменный омлет Umbrella', 'Umbrella Special Omelett'),
      d: n('Cheese, chicken, mushrooms & sausage — the full house', 'Fromage, poulet, champignons & saucisse — la totale', 'Сыр, курица, грибы и колбаски — полный набор', 'Käse, Huhn, Champignons & Wurst — das volle Programm') },

    /* ── 🥦 BOILED VEGETABLES ──────────────────────────────────────────── */
    { id: 'boiled-vegetable', cat: 'boiled', price: 1000, img: 'boiled-veg.jpg', emoji: '🥦', tags: ['veg', 'vegan'],
      n: n('Boiled Vegetables', 'Légumes bouillis', 'Отварные овощи', 'Gekochtes Gemüse'),
      d: n('Lightly steamed seasonal vegetables, simply seasoned', 'Légumes de saison vapeur, assaisonnés simplement', 'Слегка приготовленные на пару сезонные овощи', 'Schonend gedämpftes Saison-Gemüse, einfach gewürzt') },
    { id: 'boiled-chicken', cat: 'boiled', price: 1400, img: 'boiled-chicken.jpg', emoji: '🍗', tags: ['chicken'],
      n: n('Boiled Chicken & Vegetables', 'Poulet bouilli et légumes', 'Отварная курица с овощами', 'Gekochtes Huhn & Gemüse'),
      d: n('Lean boiled chicken with vegetables in a clear broth', 'Poulet maigre et légumes dans un bouillon clair', 'Нежная отварная курица с овощами в прозрачном бульоне', 'Mageres Huhn mit Gemüse in klarer Brühe') },
    { id: 'boiled-prawns', cat: 'boiled', price: 1700, img: 'boiled-prawns.jpg', emoji: '🍤', tags: ['prawns'], popular: true,
      n: n('Boiled Prawns & Vegetables', 'Crevettes bouillies et légumes', 'Отварные креветки с овощами', 'Gekochte Garnelen & Gemüse'),
      d: n('Sweet prawns with vegetables in a light broth', 'Crevettes sucrées et légumes dans un bouillon léger', 'Сладкие креветки с овощами в лёгком бульоне', 'Süsse Garnelen mit Gemüse in leichter Brühe') },

    /* ── 🥞 PANCAKES ───────────────────────────────────────────────────── */
    { id: 'pancake-fruit', cat: 'pancakes', price: 900, img: 'pancakes.jpg', emoji: '🍌', tags: ['veg'], popular: true,
      n: n('Banana & Pineapple Pancake with Topping', 'Pancake banane & ananas avec garniture', 'Бананово-ананасовый панкейк с топпингом', 'Bananen-Ananas-Pancake mit Topping'),
      options: [
        { id: 'jam',       price: 900,  n: n('with Jam', 'avec confiture', 'с джемом', 'mit Marmelade') },
        { id: 'icecream',  price: 1000, n: n('with Ice Cream', 'avec glace', 'с мороженым', 'mit Eiscreme') },
        { id: 'curdkitul', price: 1000, n: n('with Curd & Kithul', 'avec yaourt & kithul', 'с йогуртом и китул', 'mit Curd & Kithul') }
      ] },
    { id: 'pancake-coconut', cat: 'pancakes', price: 900, img: 'pancake-coconut.jpg', emoji: '🥥', tags: ['veg'],
      n: n('Coconut Pancake', 'Pancake à la noix de coco', 'Кокосовый панкейк', 'Kokos-Pancake'),
      options: [
        { id: 'honey',  price: 900, n: n('Coconut Honey', 'coco & miel', 'кокос и мёд', 'Kokos-Honig') },
        { id: 'banana', price: 950, n: n('Coconut Banana', 'coco & banane', 'кокос и банан', 'Kokos-Banane') }
      ] },
    { id: 'pancake-chocolate', cat: 'pancakes', price: 950, img: 'choc-pancake.jpg', emoji: '🍫', tags: ['veg'], popular: true,
      n: n('Chocolate Pancake', 'Pancake au chocolat', 'Шоколадный панкейк', 'Schoko-Pancake'),
      options: [
        { id: 'choc',   price: 950,  n: n('Chocolate Pancake', 'pancake au chocolat', 'шоколадный панкейк', 'Schoko-Pancake') },
        { id: 'chocban', price: 1000, n: n('Chocolate Banana Pancake', 'pancake chocolat-banane', 'шоколадно-банановый панкейк', 'Schoko-Bananen-Pancake') }
      ] },
    { id: 'pancake-umbrella-choc-coco', cat: 'pancakes', price: 1050, img: 'special-pancake.jpg', emoji: '☔', tags: ['veg', 'chef'], popular: true, signature: true,
      n: n('Umbrella Special: Chocolate & Coconut Pancake', 'Spécial Umbrella : pancake chocolat & coco', 'Спешиал Umbrella: шоколадно-кокосовый панкейк', 'Umbrella Special: Schoko-Kokos-Pancake'),
      d: n('Rich chocolate pancake layered with toasted coconut', 'Pancake au chocolat riche, noix de coco toastée', 'Насыщенный шоколадный панкейк с поджаренным кокосом', 'Saftiger Schoko-Pancake mit gerösteter Kokosnuss') },
    { id: 'pancake-umbrella-cheese-choc', cat: 'pancakes', price: 1050, img: 'special-pancake-cheese.jpg', emoji: '🧀', tags: ['veg', 'cheese', 'chef'], signature: true,
      n: n('Umbrella Special: Cheese Chocolate Pancake', 'Spécial Umbrella : pancake fromage & chocolat', 'Спешиал Umbrella: сырно-шоколадный панкейк', 'Umbrella Special: Käse-Schoko-Pancake'),
      d: n('Molten cheese and chocolate in one fluffy pancake', 'Fromage fondant et chocolat dans un pancake moelleux', 'Тающий сыр и шоколад в одном воздушном панкейке', 'Geschmolzener Käse und Schokolade in einem fluffigen Pancake') },

    /* ── 🍨 SWEET CORNER ───────────────────────────────────────────────── */
    { id: 'sweet-fruit-salad', cat: 'sweet', price: 650, img: 'fruit-salad.jpg', emoji: '🍉', tags: ['veg', 'vegan'],
      n: n('Fruit Salad (Plain)', 'Salade de fruits nature', 'Фруктовый салат (классический)', 'Obstsalat (natur)'),
      d: n('Seasonal tropical fruit, freshly cut', 'Fruits tropicaux de saison, coupés minute', 'Сезонные тропические фрукты, свежая нарезка', 'Saisonales Tropenobst, frisch geschnitten') },
    { id: 'sweet-ice-cream', cat: 'sweet', price: 750, img: 'icecream-scoop.jpg', emoji: '🍨', tags: ['veg'],
      n: n('Ice Cream', 'Glace', 'Мороженое', 'Eiscreme') },
    { id: 'sweet-curd-kithul', cat: 'sweet', price: 750, img: 'curd-kithul.jpg', emoji: '🍯', tags: ['veg'], popular: true,
      n: n('Curd & Kithul', 'Curd & Kithul', 'Творог и китул', 'Curd & Kithul'),
      d: n('Buffalo curd drizzled with kithul palm treacle', 'Curd de bufflonne nappé de mélasse de kithul', 'Буйволиный творог с пальмовой патокой китул', 'Büffel-Joghurt mit Kithul-Palmsirup') },

    /* ── 🍦 ICE CREAM ──────────────────────────────────────────────────── */
    { id: 'ice-vanilla', cat: 'icecream', price: 800, img: 'icecream.jpg', emoji: '🍦', tags: ['veg'],
      n: n('Vanilla Ice Cream', 'Glace vanille', 'Ванильное мороженое', 'Vanille-Eis') },
    { id: 'ice-chocolate', cat: 'icecream', price: 800, img: 'icecream-choc.jpg', emoji: '🍫', tags: ['veg'],
      n: n('Chocolate Ice Cream', 'Glace chocolat', 'Шоколадное мороженое', 'Schokoladen-Eis') },

    /* ── 🥤 FRESH JUICE ────────────────────────────────────────────────── */
    { id: 'juice-lime', cat: 'juice', price: 800, img: 'juice-lime.jpg', emoji: '🍋', tags: ['veg', 'vegan'],
      n: n('Lime Fresh Juice', 'Jus frais de citron vert', 'Свежий сок лайма', 'Frischer Limettensaft') },
    { id: 'juice-banana', cat: 'juice', price: 800, img: 'juice.jpg', emoji: '🍌', tags: ['veg'],
      n: n('Banana Fresh Juice', 'Jus frais de banane', 'Свежий банановый сок', 'Frischer Bananensaft') },
    { id: 'juice-pineapple', cat: 'juice', price: 800, img: 'juice-pineapple.jpg', emoji: '🍍', tags: ['veg', 'vegan'],
      n: n('Pineapple Fresh Juice', 'Jus frais d’ananas', 'Свежий ананасовый сок', 'Frischer Ananassaft') },
    { id: 'juice-mango', cat: 'juice', price: 800, img: 'juice-mango.jpg', emoji: '🥭', tags: ['veg', 'vegan'], popular: true,
      n: n('Mango Fresh Juice', 'Jus frais de mangue', 'Свежий сок манго', 'Frischer Mangosaft') },
    { id: 'juice-watermelon', cat: 'juice', price: 800, img: 'juice-watermelon.jpg', emoji: '🍉', tags: ['veg', 'vegan'],
      n: n('Watermelon Fresh Juice', 'Jus frais de pastèque', 'Свежий арбузный сок', 'Frischer Wassermelonensaft') },
    { id: 'juice-papaya', cat: 'juice', price: 800, img: 'juice-papaya.jpg', emoji: '🧡', tags: ['veg', 'vegan'],
      n: n('Papaya Fresh Juice', 'Jus frais de papaye', 'Свежий сок папайи', 'Frischer Papayasaft') },

    /* ── 🥛 LASSIE ─────────────────────────────────────────────────────── */
    { id: 'lassi-plain', cat: 'lassi', price: 950, img: 'lassi.jpg', emoji: '🥛', tags: ['veg'],
      n: n('Plain Lassie', 'Lassi nature', 'Классический ласси', 'Natur-Lassi') },
    { id: 'lassi-banana', cat: 'lassi', price: 950, img: 'lassi-banana.jpg', emoji: '🍌', tags: ['veg'],
      n: n('Banana Lassie', 'Lassi à la banane', 'Банановый ласси', 'Bananen-Lassi') },
    { id: 'lassi-mango', cat: 'lassi', price: 950, img: 'lassi-mango.jpg', emoji: '🥭', tags: ['veg'], popular: true,
      n: n('Mango Lassie', 'Lassi à la mangue', 'Манго-ласси', 'Mango-Lassi') },
    { id: 'lassi-papaya', cat: 'lassi', price: 950, img: 'lassi-papaya.jpg', emoji: '🧡', tags: ['veg'],
      n: n('Papaya Lassie', 'Lassi à la papaye', 'Ласси из папайи', 'Papaya-Lassi') },

    /* ── 🍹 MILKSHAKE ──────────────────────────────────────────────────── */
    { id: 'shake-vanilla', cat: 'milkshake', price: 950, img: 'milkshake-vanilla.jpg', emoji: '🍦', tags: ['veg'],
      n: n('Vanilla Milkshake', 'Milkshake vanille', 'Ванильный молочный коктейль', 'Vanille-Milchshake') },
    { id: 'shake-chocolate', cat: 'milkshake', price: 950, img: 'milkshake.jpg', emoji: '🍫', tags: ['veg'], popular: true,
      n: n('Chocolate Milkshake', 'Milkshake chocolat', 'Шоколадный молочный коктейль', 'Schoko-Milchshake') },
    { id: 'shake-strawberry', cat: 'milkshake', price: 950, img: 'milkshake-strawberry.jpg', emoji: '🍓', tags: ['veg'],
      n: n('Strawberry Milkshake', 'Milkshake fraise', 'Клубничный молочный коктейль', 'Erdbeer-Milchshake') },
    { id: 'shake-choc-banana', cat: 'milkshake', price: 1000, img: 'milkshake-banana.jpg', emoji: '🍌', tags: ['veg'],
      n: n('Chocolate Banana Milkshake', 'Milkshake chocolat-banane', 'Шоколадно-банановый коктейль', 'Schoko-Bananen-Milchshake') },

    /* ── ☕ TEA & COFFEE ───────────────────────────────────────────────── */
    { id: 'tea-black', cat: 'tea', price: 500, img: 'tea.jpg', emoji: '🫖', tags: ['veg', 'vegan'], popular: true,
      n: n('Sri Lankan Black Tea', 'Thé noir sri-lankais', 'Шри-ланкийский чёрный чай', 'Sri-lankischer Schwarztee'),
      d: n('Pure Ceylon tea from the hills above Ella', 'Thé de Ceylan des collines au-dessus d’Ella', 'Чистый цейлонский чай с холмов над Эллой', 'Reiner Ceylon-Tee aus den Hügeln über Ella'),
      options: pot(500, 600) },
    { id: 'tea-healthy', cat: 'tea', price: 550, img: 'tea-healthy.jpg', emoji: '🌿', tags: ['veg', 'vegan'],
      n: n('Healthy Tea', 'Thé bien-être', 'Полезный чай', 'Gesundheitstee'),
      d: n('Herbal mountain blend, caffeine free', 'Infusion de montagne aux herbes, sans caféine', 'Горный травяной сбор без кофеина', 'Kräuter-Bergmischung, koffeinfrei'),
      options: pot(550, 650) },
    { id: 'coffee-black', cat: 'tea', price: 550, img: 'coffee.jpg', emoji: '☕', tags: ['veg', 'vegan'], popular: true,
      n: n('Sri Lankan Black Coffee', 'Café noir sri-lankais', 'Шри-ланкийский чёрный кофе', 'Sri-lankischer Schwarzkaffee'),
      options: pot(550, 650) },

    /* ── 🧊 ICED ───────────────────────────────────────────────────────── */
    { id: 'iced-tea', cat: 'iced', price: 850, img: 'iced-tea.jpg', emoji: '🍋', tags: ['veg', 'vegan'], popular: true,
      n: n('Ice Tea (lime & black tea)', 'Thé glacé (citron vert & thé noir)', 'Айс ти (лайм и чёрный чай)', 'Eistee (Limette & Schwarztee)'),
      d: n('Chilled black tea shaken with fresh lime', 'Thé noir glacé secoué avec du citron vert frais', 'Охлаждённый чёрный чай со свежим лаймом', 'Gekühlter Schwarztee mit frischer Limette') },
    { id: 'iced-coffee', cat: 'iced', price: 850, img: 'iced-drinks.jpg', emoji: '🧊', tags: ['veg'], popular: true,
      n: n('Ice Coffee (milk & black coffee)', 'Café glacé (lait & café noir)', 'Айс кофе (молоко и чёрный кофе)', 'Eiskaffee (Milch & Schwarzkaffee)'),
      d: n('Cold black coffee layered with chilled milk', 'Café noir froid nappé de lait glacé', 'Холодный чёрный кофе со слоем молока', 'Kalter Schwarzkaffee mit kalter Milch geschichtet') },

    /* ── 🥫 SOFT DRINKS ────────────────────────────────────────────────── */
    { id: 'drink-water', cat: 'softdrinks', price: 250, img: 'soft-drinks.jpg', emoji: '💧', tags: ['veg', 'vegan'],
      n: n('Water (1 L)', 'Eau (1 L)', 'Вода (1 л)', 'Wasser (1 L)') },
    { id: 'drink-cola', cat: 'softdrinks', price: 350, img: 'cola.jpg', emoji: '🥤', tags: ['veg', 'vegan'],
      n: n('Coca Cola', 'Coca Cola', 'Кока-Кола', 'Coca-Cola') },
    { id: 'drink-sprite', cat: 'softdrinks', price: 350, img: 'sprite.jpg', emoji: '🍋', tags: ['veg', 'vegan'],
      n: n('Sprite', 'Sprite', 'Спрайт', 'Sprite') },
    { id: 'drink-ginger-beer', cat: 'softdrinks', price: 350, img: 'ginger-beer.jpg', emoji: '🫚', tags: ['veg', 'vegan'], popular: true,
      n: n('Ginger Beer', 'Ginger Beer (bière de gingembre)', 'Имбирное пиво', 'Ginger Beer') },
    { id: 'drink-soda', cat: 'softdrinks', price: 350, img: 'soda.jpg', emoji: '🫧', tags: ['veg', 'vegan'],
      n: n('Soda', 'Soda', 'Содовая', 'Soda') }
  ];

  /* prefix image path */
  items.forEach(function (it) { it.img = IMG + it.img; });
  categories.forEach(function (c) { c.img = IMG + c.img; });

  global.UC_MENU = { categories: categories, items: items, addons: [ADDON_CHICKEN, ADDON_JACKFRUIT] };
})(typeof window !== 'undefined' ? window : globalThis);
