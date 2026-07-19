$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ($root -ne (Resolve-Path "C:\Users\kirub\OneDrive\Desktop\pommy").Path) {
  throw "Build root does not match the Pommy workspace."
}

function Encode([string]$value) {
  return [System.Net.WebUtility]::HtmlEncode($value)
}

function Get-Shell {
  param(
    [string]$Title,
    [string]$Description,
    [bool]$NoIndex = $false,
    [string]$PageId = "",
    [string]$RelativePath = "index.html"
  )

  $robots = if ($NoIndex) { '<meta name="robots" content="noindex,follow"/>' } else { "" }
  $encodedTitle = Encode $Title
  $encodedDescription = Encode $Description
  $pageAttribute = if ($PageId) { ' data-wf-page="' + (Encode $PageId) + '"' } else { "" }
  $priorityAssets = if ($PageId) {
    '  <link rel="preload" href="/assets/fonts/dm-sans-2.woff2" as="font" type="font/woff2" crossorigin/>' + "`r`n" +
    '  <link rel="preload" href="/assets/fonts/pommy-ui-icons.woff2" as="font" type="font/woff2" crossorigin/>' + "`r`n" +
    '  <link rel="preload" href="/assets/images/optimized/home-hero-1258.webp" imagesrcset="/assets/images/optimized/home-hero-480.webp 480w, /assets/images/optimized/home-hero-800.webp 800w, /assets/images/optimized/home-hero-1258.webp 1258w" imagesizes="(max-width: 767px) calc(100vw - 32px), 50vw" as="image" type="image/webp" fetchpriority="high"/>'
  } else { "" }
  $route = ($RelativePath -replace '\\', '/').ToLowerInvariant()
  $isHome = $route -eq "index.html"
  $isMenuPage = $route -eq "menu/index.html" -or $route.StartsWith("category/") -or $route.StartsWith("dish-categories/")
  $isProductPage = $route.StartsWith("product/")
  $isCheckoutPage = $route -eq "checkout/index.html"
  $isLocalMenuPage = $route -in @("burger-around-cmc/index.html", "pizza-around-cmc/index.html")
  $needsMenuData = $isHome -or $isMenuPage -or $isProductPage -or $isLocalMenuPage
  $needsBlogData = $isHome -or $route -eq "blog/index.html" -or $route.StartsWith("blog-posts/") -or $route.StartsWith("blog-posts-category/")
  $needsSupabase = $needsMenuData -or $isCheckoutPage
  $scripts = [System.Collections.Generic.List[string]]::new()
  if ($needsMenuData) { $scripts.Add('  <script src="/assets/data/menu.js"></script>') }
  if ($needsBlogData) { $scripts.Add('  <script src="/assets/data/blog.js"></script>') }
  $scripts.Add('  <script src="/assets/config/public-runtime-config.js"></script>')
  $scripts.Add('  <script src="/assets/config/seo-config.js"></script>')
  $scripts.Add('  <script src="/assets/config/order-config.js"></script>')
  if ($needsSupabase) {
    $scripts.Add('  <script src="/assets/vendor/supabase-js-2.49.4.min.js"></script>')
    $scripts.Add('  <script src="/assets/config/supabase-config.js"></script>')
    $scripts.Add('  <script src="/assets/js/supabase-client.js"></script>')
  }
  if ($needsMenuData) { $scripts.Add('  <script src="/assets/js/menu-service.js"></script>') }
  if ($isCheckoutPage) { $scripts.Add('  <script src="/assets/js/order-service.js"></script>') }
  $scripts.Add('  <script src="/assets/js/analytics.js"></script>')
  $scripts.Add('  <script src="/assets/js/pommy-site.js"></script>')
  if ($isMenuPage) { $scripts.Add('  <script src="/assets/js/menu-page.js"></script>') }
  if ($isProductPage) { $scripts.Add('  <script src="/assets/js/product-page.js"></script>') }
  if ($isCheckoutPage) { $scripts.Add('  <script src="/assets/js/checkout-page.js"></script>') }
  $scripts.Add('  <script src="/assets/js/jquery-3.5.1.min.js" type="text/javascript"></script>')
  $scripts.Add('  <script>window.Pommy.motionReady.then(function(){var script=document.createElement("script");script.src="/assets/js/webflow-original.js";document.body.appendChild(script);});</script>')
  $scriptMarkup = [string]::Join("`r`n", $scripts)
  return @"
<!DOCTYPE html>
<html lang="en" data-wf-site="6165adad51c39da51d4fe6cd"$pageAttribute>
<head>
  <meta charset="utf-8"/>
  <title>$encodedTitle</title>
  <meta name="description" content="$encodedDescription"/>
  <meta property="og:title" content="$encodedTitle"/>
  <meta property="og:description" content="$encodedDescription"/>
  <meta property="og:type" content="website"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="$encodedTitle"/>
  <meta name="twitter:description" content="$encodedDescription"/>
  $robots
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
$priorityAssets
  <link href="/assets/css/webflow-original.css" rel="stylesheet" type="text/css"/>
  <link href="/assets/css/dm-sans.css" rel="stylesheet" type="text/css"/>
  <link href="/assets/css/pommy-site.css" rel="stylesheet" type="text/css"/>
  <link href="/assets/images/optimized/pommy-logo-192.png" rel="shortcut icon" type="image/png"/>
  <link href="/assets/images/optimized/pommy-logo-192.png" rel="apple-touch-icon"/>
  <script type="application/ld+json" data-pommy-schema="restaurant">{"@context":"https://schema.org","@type":"FastFoodRestaurant","name":"Pommy Burger and Pizza","telephone":"+251956905484","address":{"@type":"PostalAddress","addressLocality":"Addis Ababa","addressCountry":"ET"},"servesCuisine":["Burgers","Pizza","Fast Food","Chicken"],"priceRange":"ETB","hasMap":"https://www.google.com/maps/search/?api=1&query=XRRH%2B5Q%20Addis%20Ababa"}</script>
  <script>!function(o,c){var n=c.documentElement,t=" w-mod-";n.className+=t+"js",("ontouchstart"in o||o.DocumentTouch&&c instanceof DocumentTouch)&&(n.className+=t+"touch");if(location.pathname==="/"&&!o.matchMedia("(prefers-reduced-motion: reduce)").matches)n.classList.add("pommy-ix2-pending")}(window,document);</script>
</head>
<body>
  <div class="page-wrapper"></div>
$scriptMarkup
</body>
</html>
"@
}

function Set-Page {
  param(
    [string]$RelativePath,
    [string]$Title,
    [string]$Description,
    [bool]$NoIndex = $false
  )
  $target = Join-Path $root $RelativePath
  $directory = Split-Path -Parent $target
  if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }
  [System.IO.File]::WriteAllText($target, (Get-Shell -Title $Title -Description $Description -NoIndex $NoIndex -RelativePath $RelativePath), [System.Text.UTF8Encoding]::new($false))
}

$nodeOutput = node -e "global.window=global;require('./assets/data/menu.js');process.stdout.write(JSON.stringify(global.POMMY_MENU))"
if ($LASTEXITCODE -ne 0) { throw "Could not read menu data." }
$products = $nodeOutput | ConvertFrom-Json

$posts = @(
  @{ slug = "burger-lovers-guide-to-pommy"; title = "A Burger Lover's Guide to Pommy Burger and Pizza"; description = "Explore Pommy's burger choices, from beef classics to the Pommy Special and chicken favorites." },
  @{ slug = "burger-or-pizza-what-to-order-at-pommy"; title = "Burger or Pizza? What to Order at Pommy"; description = "A practical guide to choosing between Pommy burgers and pizzas for your next meal in Addis Ababa." },
  @{ slug = "quick-food-options-in-addis-ababa"; title = "Quick Food Options in Addis Ababa for Busy Days"; description = "Find practical burger, wrap, chicken, breakfast and drink options at Pommy for busy days in Addis Ababa." },
  @{ slug = "what-makes-a-great-chicken-burger"; title = "What Makes a Great Chicken Burger?"; description = "A look at texture, toppings and balance in a satisfying chicken burger, with a Pommy menu example." },
  @{ slug = "breakfast-ideas-in-addis-ababa"; title = "Breakfast Ideas to Start Your Day in Addis Ababa"; description = "Explore sandwiches, eggs, pancakes, fetira, chechebsa and hot drinks available on Pommy's breakfast menu." },
  @{ slug = "pommy-menu-guide"; title = "Pommy Menu Guide: Burgers, Pizza, Chicken and More"; description = "A category-by-category introduction to the Pommy Burger and Pizza menu in Addis Ababa." }
)

$primary = @{
  "about\index.html" = @("About Pommy Burger and Pizza | Addis Ababa", "Learn about Pommy Burger and Pizza, a casual fast-food restaurant in Addis Ababa serving burgers, pizza, chicken, breakfast, wraps and drinks.")
  "menu\index.html" = @("Menu & Prices | Pommy Burger and Pizza", "Browse the Pommy Burger and Pizza menu with real ETB prices for burgers, pizza, chicken, breakfast, wraps, juices, shakes and drinks.")
  "blog\index.html" = @("Pommy Blog | Burgers, Pizza & Food in Addis Ababa", "Read practical guides to Pommy's burgers, pizza, breakfast and menu choices in Addis Ababa.")
  "contact\index.html" = @("Contact & Directions | Pommy Burger and Pizza", "Call Pommy Burger and Pizza, get directions using the confirmed Addis Ababa plus code, or browse the menu and prices.")
  "checkout\index.html" = @("Checkout | Pommy Burger and Pizza", "Review your Pommy order, choose delivery or takeaway, and prepare a cash-on-delivery order summary.")
  "delivery\index.html" = @("Delivery & Takeaway | Pommy Burger and Pizza", "Learn how to prepare a Pommy delivery or takeaway order and call the restaurant to confirm it.")
  "burger-around-cmc\index.html" = @("Burgers Around CMC | Pommy Burger and Pizza", "Explore Pommy burgers around CMC in Addis Ababa, view current ETB prices and prepare an order from the full menu.")
  "pizza-around-cmc\index.html" = @("Pizza Around CMC | Pommy Burger and Pizza", "Explore Pommy pizza around CMC in Addis Ababa, compare current ETB prices and prepare an order from the full menu.")
  "404\index.html" = @("Page Not Found | Pommy Burger and Pizza", "Return to the Pommy Burger and Pizza homepage or browse the menu.")
  "401\index.html" = @("Page Unavailable | Pommy Burger and Pizza", "Return to the Pommy Burger and Pizza homepage or browse the menu.")
}

foreach ($entry in $primary.GetEnumerator()) {
  Set-Page -RelativePath $entry.Key -Title $entry.Value[0] -Description $entry.Value[1] -NoIndex ($entry.Key -match '^(401|404)')
}

foreach ($product in $products) {
  $description = if ($product.description) { $product.description } else { "View $($product.name), its ETB price, and add it to your Pommy order." }
  Set-Page -RelativePath ("product\{0}\index.html" -f $product.slug) -Title ("{0} | Pommy Burger and Pizza" -f $product.name) -Description $description
}

foreach ($post in $posts) {
  Set-Page -RelativePath ("blog-posts\{0}\index.html" -f $post.slug) -Title ("{0} | Pommy Blog" -f $post.title) -Description $post.description
}

$knownProducts = @($products.slug)
$knownPosts = @($posts.slug)
$adminRoot = Join-Path $root "admin"
$existingPages = Get-ChildItem -Path $root -Recurse -Filter index.html -File | Where-Object {
  $_.FullName -ne (Join-Path $root "index.html") -and -not $_.FullName.StartsWith($adminRoot + [System.IO.Path]::DirectorySeparatorChar)
}
foreach ($page in $existingPages) {
  $relative = [System.IO.Path]::GetRelativePath($root, $page.FullName)
  if ($primary.ContainsKey($relative)) { continue }
  $parts = $relative -split '[\\/]'
  if ($parts[0] -eq "product" -and $knownProducts -contains $parts[1]) { continue }
  if ($parts[0] -eq "blog-posts" -and $knownPosts -contains $parts[1]) { continue }

  $title = "Pommy Burger and Pizza"
  $description = "Browse the Pommy menu, restaurant information and contact details."
  if ($parts[0] -in @("category", "dish-categories")) {
    $title = "Menu | Pommy Burger and Pizza"
    $description = "Browse Pommy menu categories and current ETB prices."
  } elseif ($parts[0] -eq "blog-posts-category") {
    $title = "Pommy Blog"
    $description = "Browse useful Pommy menu and food articles."
  } elseif ($parts[0] -eq "team-members") {
    $title = "About Pommy Burger and Pizza"
    $description = "Learn about Pommy Burger and Pizza in Addis Ababa."
  } elseif ($parts[0] -eq "product") {
    $title = "Menu Item Not Found | Pommy Burger and Pizza"
    $description = "Browse the current Pommy menu and prices."
  } elseif ($parts[0] -eq "blog-posts") {
    $title = "Article Not Found | Pommy Blog"
    $description = "Browse current Pommy Burger and Pizza articles."
  }
  Set-Page -RelativePath $relative -Title $title -Description $description -NoIndex $true
}

$homePath = Join-Path $root "index.html"
$homeHtml = Get-Shell -Title "Pommy Burger and Pizza | Burgers & Pizza in Addis Ababa" -Description "Browse Pommy Burger and Pizza in Addis Ababa: real menu items, clear ETB prices, dine-in, takeaway, directions and easy order preparation." -PageId "6165adad51c39dd2424fe6cc" -RelativePath "index.html"
[System.IO.File]::WriteAllText($homePath, $homeHtml, [System.Text.UTF8Encoding]::new($false))

node (Join-Path $PSScriptRoot "generate-seo.cjs")
if ($LASTEXITCODE -ne 0) { throw "SEO generation failed." }

node (Join-Path $PSScriptRoot "prerender-public.cjs")
if ($LASTEXITCODE -ne 0) { throw "Static prerender failed." }

Write-Output ("Generated {0} product pages and {1} blog posts." -f $products.Count, $posts.Count)
