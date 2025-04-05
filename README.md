# SX.js (Beta):  Lightweight AJAX and DOM Manipulation. 
 
SX.js is a tiny, dependency-free JavaScript framework that makes working with AJAX and the DOM incredibly easy.  Inspired by HTMX, it provides a clean, chainable API that lets you write concise and readable code for your front-end interactions.  Think of it as a super-streamlined way to fetch data, update your page, and add simple effects – all without the bloat of larger libraries.

## Why SX.js?

*   **Simple & Fluent:**  Write elegant code with a chainable API that's easy to understand and use.
*   **Effortless AJAX:**  Handle GET and POST requests, including form submissions, with minimal fuss.
*   **Powerful Form Filling:** The `.fill()` feature automatically populates form fields from JSON responses. This powerful method intelligently manages multiple inputs, checkboxes, radio buttons, and select elements.
*   **Easy DOM Updates:**  Modify your page content using intuitive `swap` methods (like `innerHTML`, `outerHTML`, etc.).
*   **Built-in Effects:**  Add visual flair with simple effects like `fadeIn`, `slideDown`, `zoomIn` and more.
*   **Out-of-Band (OOB) Swaps:** Update multiple parts of your page with a single AJAX response.  Ideal for dashboards and complex layouts.
*   **Scheduled Tasks:**  Easily run recurring tasks with `.every()`, perfect for live updates and polling.  Stop them anytime with `.stop()`.
*   **Zero Dependencies:**  SX.js stands alone – no need to include other libraries.
*   **Tiny Footprint:**  Keep your project lightweight and fast.

## Getting Started

Just add `sx.js` to your HTML:

```html
<script src="sx.js"></script>
```

## Examples - See it in Action!

**Fetch data and update an element:**

```javascript
sx("#result")
  .get("http://localhost:3000/data")
  .swap("innerHTML")
  .catch(error => console.error("Error:", error));
```

**Submit a form with POST:**

```javascript
sx("#message")
  .post("http://localhost:3000/submit")
  .with("#myForm")  // Automatically handles form data
  .swap("innerHTML")
  .catch(error => console.error("Error:", error));
```

**Populate a form automatically:**

```javascript
sx("#myForm")
  .get("http://localhost:3000/user/123")
  .fill() // fills the form with the JSON response
  .catch(error => console.error("Error:", error));
```

**Add a smooth fade-in effect:**

```javascript
sx("#content")
  .get("http://localhost:3000/new-content")
  .swap("innerHTML")
  .effect("fadeIn", 500) // Fade in over 500ms
  .catch(error => console.error("Error:", error));
```

**Update multiple elements (Out-of-Band):**

```javascript
sx() // No initial selector needed for OOB
  .get("http://localhost:3000/multiple-updates")
  .oob(
    { id: "#header", swap: "innerHTML", effect: "slideDown" },
    { id: "#sidebar", swap: "innerHTML", effect: "fadeIn" }
  )
  .catch(error => console.error("Error:", error));
```

**Run a task every 2 seconds:**

```javascript
sx("#updates")
  .get("http://localhost:3000/items")
  .swap("afterbegin")
  .every("2s", "myUpdateInterval");

// Stop the interval later:
sx().stop("myUpdateInterval");
```

**Complete Form Filling Example:**

```javascript
// If /fill returns:  { "name": "John Doe", "email": "john@example.com", "subscribe": true, "interests": ["sports", "reading"] }
sx("#myForm")
    .get("http://localhost:3000/fill")
    .fill() // SX.js handles the rest!
    .catch(error => console.error("Error:", error));
```

## API Reference - Full Control

*   **`sx(selector)`:**  Starts the chain.  `selector` is a CSS selector (e.g., `"#myElement"`).  Omit the selector for Out-of-Band operations.

*   **`.get(url)`:**  Performs a GET request.
*   **`.post(url)`:**  Performs a POST request.
*   **`.with(formSelector)`:**  Includes form data (as JSON) in a POST request.  Handles multiple inputs with the same name gracefully.

*   **`.fill()`:** Automatically populates the selected `<form>` with data from a JSON response after a `.get()`.  Handles different input types intelligently.

*   **`.swap(method)`:**  Determines how the server response is inserted into the DOM:
    *   `"innerHTML"`:  Replaces the element's content.
    *   `"outerHTML"`:  Replaces the entire element.
    *   `"beforeend"`:  Adds content at the end of the element.
    *   `"afterbegin"`:  Adds content at the beginning of the element.

*   **`.effect(effectName, duration = 200)`:**  Applies an effect *after* the DOM update:
    *   `fadeIn`, `fadeOut`, `slideUp`, `slideDown`, `slideLeft`, `slideRight`, `zoomIn`, `zoomOut`, `rotate`
    *   `duration` is in milliseconds.

*   **`.oob(...configs)`:**  For updating multiple elements.  Each `config` object needs:
    *   `id`:  The target element's CSS selector.
    *   `swap`:  The swap method.
    *   `effect` (optional):  The effect name.
    *    `duration` (optional): The effect duration.

*   **`.catch(handler)`:**  Handles errors gracefully.  `handler` is a function that receives the error object.

*   **`.every(interval, key = null)`:** Runs the chain repeatedly.  `interval` can be milliseconds (e.g., `1000`) or a string (e.g., `"2s"`).  `key` is an optional ID to stop the interval later.
*    **`sx().stop(key)`:** Stops a repeating task started with `.every()`.
