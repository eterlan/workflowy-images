// ==UserScript==
// @name         workflowy-images-and-bilibili-videos
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Embed image links into workflowy
// @author       Jonathan Leung (https://github.com/jonleung)&eterlan(https://github.com/eterlan)
// @match        https://workflowy.com/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.13.1/underscore-min.js
// ==/UserScript==
"use strict";

var IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".bmp"];

function createImageNodeAfterNode($node, imgSrc) {
  if ($node.parent().find(".content-img").length === 0) {
    var $div = $("<div>").addClass("content-img");
    var $img = $("<img>").attr("src", imgSrc).css({
      "max-width": "100%",
      "max-height": "350px",
    });
    $div.append($img);

    $node.after($div);
  }
}

function generateImagesForContentNode(node) {
  var $node = $(node);

  var text = $node.text();

  var markdownImageRegex = /\!\[.*\]\((.+)\)/;
  var matcher = text.match(markdownImageRegex);
  if (matcher !== null) {
    var imgSrc = matcher[1];
    createImageNodeAfterNode($node, imgSrc);
  }
}

function generateImagesForLinkNode(node) {
  var $node = $(node);

  var url = $node.text();
  var hasImageExtension = IMAGE_EXTENSIONS.some((ext) =>
    url.toLowerCase().endsWith(ext)
  );
  if (hasImageExtension) {
    createImageNodeAfterNode($node.parent().parent(), url);
  }
}

// 添加 B 站视频 ID 提取函数
function getBilibiliVideoId(url) {
  const bvMatch = url.match(/BV\w{10}/);
  return bvMatch ? bvMatch[0] : null;
}

function createBilibiliIframeAfterNode($node, videoId) {
  if ($node.parent().find(".content-video").length === 0) {
    var $div = $("<div>").addClass("content-video");
    var $iframe = $("<iframe>")
      .attr(
        "src",
        `https://player.bilibili.com/player.html?bvid=${videoId}&page=1&autoplay=0`
      )
      .attr("scrolling", "no")
      .attr("border", "0")
      .attr("frameborder", "no")
      .attr("framespacing", "0")
      .attr("allowfullscreen", "true")
      .css({
        width: "100%",
        height: "500px",
        "max-width": "800px",
      });
    $div.append($iframe);
    $node.after($div);
  }
}

function generateVideoForLinkNode(node) {
  var $node = $(node);
  var url = $node.text();

  // 检查是否是 B 站链接
  if (url.includes("bilibili.com/video")) {
    var videoId = getBilibiliVideoId(url);
    if (videoId) {
      createBilibiliIframeAfterNode($node.parent().parent(), videoId);
    }
  }
}

function checkForChanges() {
  // 首先移除所有不再有对应链接的图片
  $("div.content-img").each(function (i, imgDiv) {
    var $imgDiv = $(imgDiv);
    var $prevContent = $imgDiv.prev(".content");

    // 检查前一个 content 元素中是否还包含图片链接
    var hasMarkdownImage = $prevContent.text().match(/\!\[.*\]\((.+)\)/);
    var hasImageLink = false;

    $prevContent.find("a.contentLink").each(function (_, link) {
      var url = $(link).text();
      if (IMAGE_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext))) {
        hasImageLink = true;
        return false; // 跳出 each 循环
      }
    });

    // 如果既没有 markdown 图片也没有图片链接，则移除图片 div
    if (!hasMarkdownImage && !hasImageLink) {
      $imgDiv.remove();
    }
  });

  // 移除不再有对应链接的视频
  $("div.content-video").each(function (i, videoDiv) {
    var $videoDiv = $(videoDiv);
    var $prevContent = $videoDiv.prev(".content");
    var hasVideoLink = false;

    $prevContent.find("a.contentLink").each(function (_, link) {
      var url = $(link).text();
      if (url.includes("bilibili.com/video")) {
        hasVideoLink = true;
        return false;
      }
    });

    if (!hasVideoLink) {
      $videoDiv.remove();
    }
  });

  // 原有的图片处理逻辑
  $("div.name div.content, div.notes div.content").each(function (i, node) {
    generateImagesForContentNode(node);
  });

  $("div.name a.contentLink, div.notes a.contentLink").each(function (i, node) {
    generateImagesForLinkNode(node);
    generateVideoForLinkNode(node); // 添加视频处理
  });
}

// 添加 MutationObserver 来监听 DOM 变化
const observer = new MutationObserver(function (mutations) {
  checkForChanges();
});

// 当页面加载完成时
$(window).on("load", function () {
  checkForChanges();

  // 开始观察 DOM 变化
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 为确保内容加载后能显示图片，额外延迟检查一次
  setTimeout(checkForChanges, 1000);
});

// When you change nodes
window.onhashchange = checkForChanges;

// When you press any keyboard key
$(document).keydown(function (e) {
  setTimeout(function () {
    checkForChanges();
  }, 250);
});
