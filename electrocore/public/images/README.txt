ElectroCore image folders
=========================

public/images/site/hero.jpg
    Optional homepage hero picture. When this file exists it is shown on the homepage;
    when it does not, the built-in laptop illustration is shown instead.
    Recommended: 1600 x 1200 px (4:3), JPG or WebP renamed to hero.jpg, under 400 KB.

public/images/products/<category-slug>/<product-slug>.jpg
    Product pictures for the catalogue imported from your photos and screenshots.
    Example:
      public/images/products/power-and-generators/vertiv-liebert-mpt-10kva-3-3-or-3-1-ups.jpg
    After adding pictures, run:  npm run catalog:technocrat
    Products without a picture show a clean name tile - nothing is broken.

public/products/
    The built-in SVG artwork for the original demo products. Leave this folder as it is.
