export default function localRequestModule(module, exports) {
  const i = {
    joinPath: function (t, e) {
      return t && 0 !== t.length ? t.replace(/\/+$/, '').concat('/' + e) : e;
    },
    ajaxGet: function (t, e, i) {
      i || ((i = e), (e = null));
      let s = new XMLHttpRequest();
      s.open('GET', t, !0);
      let n = () => {
        s.readyState === XMLHttpRequest.DONE &&
          (s.removeEventListener('readystatechange', n, !1),
          s.status >= 200 && s.status < 300
            ? i(null, s.response)
            : i(new Error('Error status: ' + s.status + ' - Unable to load ' + t)));
      };
      if ((s.addEventListener('readystatechange', n, !1), e))
        for (let t in e) s.setRequestHeader(t, e[t]);
      s.send(null);
    },
    loadImg: function (t, e) {
      let i = document.createElement('img');
      i.crossOrigin = 'anonymous';
      let s = () => (
          i.removeEventListener('load', s, !1),
          i.removeEventListener('error', n, !1),
          e(null, i)
        ),
        n = (t) => (
          i.removeEventListener('load', s, !1),
          i.removeEventListener('error', n, !1),
          e(t, i)
        );
      return (
        i.addEventListener('load', s, !1),
        i.addEventListener('error', n, !1),
        (i.src = t),
        i
      );
    },
    img2ImgData: (function () {
      let t = null;
      return function (e) {
        (t || (t = document.createElement('canvas')), (t.width = e.width), (t.height = e.height));
        const i = t.getContext('2d');
        return (i.drawImage(e, 0, 0), i.getImageData(0, 0, e.width, e.height));
      };
    })(),
  };
  module.exports = i;
}
