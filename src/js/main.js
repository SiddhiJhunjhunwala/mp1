/* MP1 portfolio interactions (vanilla ES6, no libraries). */

const COMPACT_AFTER = 40; // px scrolled before the navbar shrinks

const navbar = document.getElementById("navbar");
const navMenu = document.getElementById("nav-menu");
const navToggle = document.getElementById("nav-toggle");
const menuLinks = Array.from(document.querySelectorAll(".navbar__link"));
const sections = Array.from(document.querySelectorAll("[data-section]"));

/* ---------------------------------------------------------------------------
 * Navbar resizing + position indicator
 * ------------------------------------------------------------------------- */

function setActiveLink(id) {
    menuLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${id}`;
        link.classList.toggle("is-active", isActive);
        if (isActive) {
            link.setAttribute("aria-current", "true");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}

function findCurrentSection() {
    const scrollBottom = window.scrollY + window.innerHeight;
    const pageBottom = document.documentElement.scrollHeight;

    // At the very bottom, always highlight the last menu item.
    if (scrollBottom >= pageBottom - 2) {
        return sections[sections.length - 1];
    }

    // Otherwise pick the last section whose top has passed the bottom edge of the navbar,
    // i.e. the section sitting directly below the navbar.
    const navBottom = navbar.getBoundingClientRect().bottom;
    let current = sections[0];
    sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= navBottom + 4) {
            current = section;
        }
    });
    return current;
}

function onScroll() {
    navbar.classList.toggle("is-compact", window.scrollY > COMPACT_AFTER);
    setActiveLink(findCurrentSection().id);
}

let ticking = false;
function requestScrollUpdate() {
    if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
            onScroll();
            ticking = false;
        });
    }
}

window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", requestScrollUpdate);
// The navbar height animates, so re-check once the transition ends.
navbar.addEventListener("transitionend", requestScrollUpdate);
onScroll();

/* ---------------------------------------------------------------------------
 * Smooth scrolling for every in-page link
 * ------------------------------------------------------------------------- */

function closeMobileMenu() {
    navMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
}

document.querySelectorAll("[data-nav-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href").slice(1);
        const target = document.getElementById(targetId);
        if (!target) return;

        event.preventDefault();
        closeMobileMenu();

        if (targetId === "home") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            // scroll-margin-top in the SCSS keeps the section clear of the navbar.
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        history.replaceState(null, "", `#${targetId}`);
    });
});

/* ---------------------------------------------------------------------------
 * Mobile menu toggle
 * ------------------------------------------------------------------------- */

navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

/* ---------------------------------------------------------------------------
 * Carousel
 * ------------------------------------------------------------------------- */

class Carousel {
    constructor(root) {
        this.root = root;
        this.slides = Array.from(root.querySelectorAll(".slide"));
        this.dotsWrap = root.querySelector(".carousel__dots");
        this.index = 0;
        this.dots = this.slides.map((slide, i) => this.createDot(i));

        root.querySelector("[data-carousel-prev]").addEventListener("click", () => this.go(this.index - 1, -1));
        root.querySelector("[data-carousel-next]").addEventListener("click", () => this.go(this.index + 1, 1));

        // Keyboard support when focus is inside the carousel
        root.addEventListener("keydown", (event) => {
            if (event.key === "ArrowLeft") this.go(this.index - 1, -1);
            if (event.key === "ArrowRight") this.go(this.index + 1, 1);
        });

        // Swipe support on touch screens
        let startX = null;
        root.addEventListener("touchstart", (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });
        root.addEventListener("touchend", (e) => {
            if (startX === null) return;
            const dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 50) {
                const dir = dx < 0 ? 1 : -1;
                this.go(this.index + dir, dir);
            }
            startX = null;
        });

        this.render();
    }

    createDot(i) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel__dot";
        dot.setAttribute("aria-label", `Show project ${i + 1}`);
        dot.addEventListener("click", () => this.go(i, i >= this.index ? 1 : -1));
        this.dotsWrap.appendChild(dot);
        return dot;
    }

    go(newIndex, direction) {
        const count = this.slides.length;
        const next = (newIndex + count) % count; // wrap around
        if (next === this.index) return;

        this.root.classList.toggle("is-reverse", direction < 0);
        this.slides.forEach((s) => s.classList.remove("is-exit"));
        this.slides[this.index].classList.add("is-exit");
        this.index = next;
        this.render();
    }

    render() {
        this.slides.forEach((slide, i) => {
            const active = i === this.index;
            slide.classList.toggle("is-active", active);
            slide.setAttribute("aria-hidden", String(!active));
            slide.querySelectorAll("button, a").forEach((el) => {
                el.tabIndex = active ? 0 : -1;
            });
        });
        this.dots.forEach((dot, i) => {
            dot.classList.toggle("is-active", i === this.index);
            dot.setAttribute("aria-current", String(i === this.index));
        });
    }
}

const carouselRoot = document.getElementById("carousel");
if (carouselRoot) {
    new Carousel(carouselRoot);
}

/* ---------------------------------------------------------------------------
 * Modals (native <dialog> with open/close animations)
 * ------------------------------------------------------------------------- */

function closeModal(dialog) {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;
    dialog.classList.add("is-closing");
    dialog.addEventListener(
        "animationend",
        () => {
            dialog.classList.remove("is-closing");
            dialog.close();
        },
        { once: true }
    );
}

document.querySelectorAll("[data-modal-open]").forEach((button) => {
    button.addEventListener("click", () => {
        const dialog = document.getElementById(button.dataset.modalOpen);
        if (dialog) dialog.showModal();
    });
});

document.querySelectorAll("dialog.modal").forEach((dialog) => {
    dialog.querySelector("[data-modal-close]").addEventListener("click", () => closeModal(dialog));

    // Clicking the dark backdrop (outside the box) closes the modal.
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeModal(dialog);
    });

    // Escape key: animate the close instead of closing instantly.
    dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeModal(dialog);
    });
});
