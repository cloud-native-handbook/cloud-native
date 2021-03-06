// Right nav highlighting
var sidebarObj = (document.getElementsByClassName("sidebar")[0]) ? document.getElementsByClassName("sidebar")[0] : document.getElementsByClassName("sidebar-home")[0]
var sidebarBottom = sidebarObj.getBoundingClientRect().bottom;
// var footerTop = document.getElementsByClassName("footer")[0].getBoundingClientRect().top;
var headerOffset = document.getElementsByClassName("container-fluid")[0].getBoundingClientRect().bottom;

// ensure that the left nav visibly displays the current topic
var current = document.getElementsByClassName("active currentPage");
var body = document.getElementsByClassName("col-content content");
if (current[0]) {
  if (sidebarObj) {
    current[0].scrollIntoView(true);
    body[0].scrollIntoView(true);
  }
  // library hack
  if (document.location.pathname.indexOf("/samples/") > -1) {
    $(".currentPage").closest("ul").addClass("in");
  }
}

function addMyClass(classToAdd) {
  var classString = this.className; // returns the string of all the classes for myDiv
  // Adds the class "main__section" to the string (notice the leading space)
  this.className = newClass; // sets className to the new string
}

/* 左侧菜单点击折叠事件 */
function navClicked(sourceLink) {
  // var classString = document.getElementById('#item' + sourceLink).className;
  // if (classString.indexOf(' in') > -1) {
  //   //collapse
  //   var newClass = classString.replace(' in', '');
  //   document.getElementById('#item' + sourceLink).className = newClass;
  // } else {
  //   //expand
  //   var newClass = classString.concat(' in');
  //   document.getElementById('#item' + sourceLink).className = newClass;
  // }
  console.log(123)
  // var oldClass = document.getElementById('#item' + sourceLink).className;
  // var newClass = oldClass.indexOf(' in') > -1 ?
  //               oldClass.replace(' in', '') : oldClass.concat(' in')
  // document.getElementById('#item' + sourceLink).className = newClass;
}


/* 高亮右边的 TOC */
function highlightTOC(heading) {
  if (document.location.pathname.indexOf("/glossary/") < 0) {
    $("#my_toc a.active").removeClass("active");

    if (heading !== "title") {
      $("#my_toc a[href='#" + heading + "']").addClass('active');
    }
  }
}

var currentHeading = "";
$(window).scroll(function () {
  var headingPositions = new Array();
  $("h1, h2, h3, h4, h5, h6").each(function () {
    if (this.id == "") this.id = "title";
    headingPositions[this.id] = this.getBoundingClientRect().top;
  });
  headingPositions.sort();
  // the headings have all been grabbed and sorted in order of their scroll
  // position (from the top of the page). First one is toppermost.
  for (var key in headingPositions) {
    if (headingPositions[key] > 0 && headingPositions[key] < 200) {
      if (currentHeading != key) {
        // a new heading has scrolled to within 200px of the top of the page.
        // highlight the right-nav entry and de-highlight the others.
        highlightTOC(key);
        currentHeading = key;
      }
      break;
    }
  }
});


// Cookie functions
function createCookie(name, value, days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function eraseCookie(name) {
  createCookie(name, "", -1);
}

var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
var selectedNightTheme = readCookie("night");

if (selectedNightTheme == "true" || (selectedNightTheme === null && prefersDark)) {
  applyNight();
  $('#switch-style').prop('checked', true);
} else {
  applyDay();
  $('#switch-style').prop('checked', false);
}



/*
 *
 * toggle menu *********************************************************************
 *
 */

$("#menu-toggle").click(function (e) {
  e.preventDefault();
  $(".wrapper").toggleClass("right-open");
  $(".col-toc").toggleClass("col-toc-hidden");
});
$("#menu-toggle-left").click(function (e) {
  e.preventDefault();
  $(".col-nav").toggleClass("col-toc-hidden");
});
$(".navbar-toggle").click(function () {
  $("#sidebar-nav").each(function () {
    $(this).toggleClass("hidden-sm");
    $(this).toggleClass("hidden-xs");
  });
});

var navHeight = $('.navbar').outerHeight(true) + 80;

$(document.body).scrollspy({
  target: '#leftCol',
  offset: navHeight
});

function loadHash(hsh) {
  hsh = decodeURIComponent(hsh) // chinese and english
  // Using jQuery's animate() method to add smooth page scroll
  // The optional number (800) specifies the number of milliseconds it takes to scroll to the specified area
  $('html, body').animate({
    scrollTop: $(hsh).offset().top - 80
  }, 800);
}

// 平滑滚动（两个行为：点击锚链接、点击之后刷新）
$(document).ready(function () {
  // Add smooth scrolling to all anchor links when click
  $(".toc-nav a").on('click', function (event) {
    // $(this).addClass('active');
    // Make sure this.hash has a value before overriding default behavior
    if (this.hash !== "") {
      // Prevent default anchor click behavior
      event.preventDefault();

      // Store hash
      var hash = this.hash;

      loadHash(hash);
      // Add hash (#) to URL when done scrolling (default click behavior)
      window.location.hash = hash;
    }
  });

  // Refresh
  if (window.location.hash) loadHash(window.location.hash);
});


$(document).ready(function () {
  $(".sidebar").Stickyfill();

  // Add smooth scrolling to all links
  $(".nav-sidebar ul li a").on('click', function (event) {

    // Make sure this.hash has a value before overriding default behavior
    if (this.hash !== "") {
      // Prevent default anchor click behavior
      event.preventDefault();

      // Store hash
      var hash = this.hash;

      // Using jQuery's animate() method to add smooth page scroll
      // The optional number (800) specifies the number of milliseconds it takes to scroll to the specified area
      $('html, body').animate({
        scrollTop: $(hash).offset().top - 80
      }, 800, function () {

        // Add hash (#) to URL when done scrolling (default click behavior)
        window.location.hash = hash;
      });
    } // End if
  });
});


/*
 *
 * make dropdown show on hover *********************************************************************
 *
 */

$('ul.nav li.dropdown').hover(function () {
  $(this).find('.dropdown-menu').stop(true, true).delay(200).fadeIn(500);
}, function () {
  $(this).find('.dropdown-menu').stop(true, true).delay(200).fadeOut(500);
});

/*
 *
 * swapStyleSheet*********************************************************************
 *
 */

// function swapStyleSheet(sheet) {
//     document.getElementById('pagestyle').setAttribute('href', sheet);
// }

function applyNight() {
  $("body").addClass("night");
}

function applyDay() {
  $("body").removeClass("night");
}

$('#switch-style').change(function () {

  if ($(this).is(':checked')) {
    applyNight();
    createCookie("night", true, 999)
  } else {
    applyDay();
    createCookie("night", false, 999);
  }
});


/*
 *
 * TEMP HACK For side menu*********************************************************************
 *
 */

$('.nav-sidebar ul li a[data-toggle]').click(function () {
  console.log(123)
  $(this).siblings().toggleClass('in');
  $(this).children('.arrow').toggleClass('down');
  // $(this).data('')
});

if ($('.nav-sidebar ul a.active').length != 0) {
  $('.nav-sidebar ul').click(function () {
    $(this).addClass('collapse in').siblings;
  });
}


/*
 *
 * Components *********************************************************************
 *
 */

$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})

// Enable glossary link popovers
// $('.glossLink').popover();

// sync tabs with the same data-group
window.onload = function () {
  $('.nav-tabs > li > a').click(function (e) {
    var group = $(this).attr('data-group');
    $('.nav-tabs > li > a[data-group="' + group + '"]').tab('show');
  })
};
