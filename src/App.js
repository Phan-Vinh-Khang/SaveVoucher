import React, { useState } from 'react';
import './App.css';

const signature = "83d889fb00505cf567c264b4361dc57d844c01a18d5ad65a0ead954deee9bbb7";
async function SaveVoucher100(dataCookie) {
  const response = await fetch('https://api.autopee.com/shopee/save-voucher', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    cookie: dataCookie,
   "signature":"83d889fb00505cf567c264b4361dc57d844c01a18d5ad65a0ead954deee9bbb7",
    "voucher_code":"CRMNUICLSOUTHT2",
    "voucher_promotionid":"1342553842421760"
  })
});
}
async function SaveVoucher50max100(dataCookie) {
  const response = await fetch('https://api.autopee.com/shopee/save-voucher', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    cookie: dataCookie,
   "signature":"83d889fb00505cf567c264b4361dc57d844c01a18d5ad65a0ead954deee9bbb7",
    "voucher_code":"CRMNUICLSOUTHT2",
    "voucher_promotionid":"1342553842421760"
  })
});
}

async function Spc(dataCookie) {
var data= await fetch('https://api.autopee.com/shopee/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    cookie: dataCookie,
    limit: 10,
    list_type: 7,
    offset: 0
  })
});
console.log(await data.json());
} 
async function checkorder(dataCookie) {
  var data= await fetch('https://tksieure.top/check_order', {
  method: 'POST',
  headers: {'Content-Type': 'application/json','cookie':'token=3gxdwk7ytEvzS0XZjU2hcfoinNOqrGTW8MVeQ51a6LIYJA9KlmBRDpHb4sCuP1770343715a26643962e070f7f2775c18deb150c6f; PHPSESSID=87ef5e373ab0d44edf7bc67673be75a3'},
  body:{cookie: dataCookie}

})
console.log(await data.json());
}
async function SaveVoucherFS(dataCookie) {
  // 0
 await fetch('https://api.autopee.com/shopee/save-voucher', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    cookie: dataCookie,
    signature: "b908c1e235da12c1bee838af5b6ea35386f81ac91d94ad7d49ec20bbaa1ed073",
    voucher_code: "FSV-1341779035983872",
    voucher_promotionid: "1341779035983872"
  })
})

// 1
await fetch('https://api.autopee.com/shopee/save-voucher', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    cookie: dataCookie,
    signature: "297313200a23197f3e706ee4fe9359364591a1485b5531ac0ec2f3884a520993",
    voucher_code: "FSV-1341779035328512",
    voucher_promotionid: "1341779035328512"
  })
})

// 2
await fetch('https://api.autopee.com/shopee/save-voucher', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    cookie: dataCookie,
    signature: "3faaa9ec8224e2ebed6fefbd6d9216356c072d72a525e351a219826b1cef03f9",
    voucher_code: "FSV-1341779053678592",
    voucher_promotionid: "1341779053678592"
  })
})

// 3
await fetch('https://api.autopee.com/shopee/save-voucher', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    cookie: dataCookie,
    signature: "3b6ccc8b3dae08b510c6ae061dc8c670ec6310d5ea5e63728d7f608277dd60fe",
    voucher_code: "FSV-1341779052630016",
    voucher_promotionid: "1341779052630016"
  })
})

// 4
await fetch('https://api.autopee.com/shopee/save-voucher', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    cookie: dataCookie,
    signature: "9af5a74a09d3753ed7452cf84bced35528031971c401796db2158b497ab4b2f1",
    voucher_code: "FSV-1341779020255232",
    voucher_promotionid: "1341779020255232"
  })
})

// 5
await fetch('https://api.autopee.com/shopee/save-voucher', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    cookie: dataCookie,
    signature: "348709ea63b82b755b1cbe98cc89b32fe593a41cbecec66726f7eae7ab77010c",
    voucher_code: "FSV-1341779020124160",
    voucher_promotionid: "1341779020124160"
  })
})

// 6
await fetch('https://api.autopee.com/shopee/save-voucher', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    cookie: dataCookie,
    signature: "fac0cdf03da34f328f4fa89d7bb4fc85b6ae1870cf4689ed7aff3febd1c294ba",
    voucher_code: "FSV-1341779028643840",
    voucher_promotionid: "1341779028643840"
  })
})

// 7
await fetch('https://api.autopee.com/shopee/save-voucher', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    cookie: dataCookie,
    signature: "d8dbfca2c1e52354ca7817e843102ef5004dcdb8425a427fce49c13de7594268",
    voucher_code: "FSV-1341779028119552",
    voucher_promotionid: "1341779028119552"
  })
})
}
function App() {
  let [cookie, setCookie] = useState("");
  return (
    <div className="App">
      <input onChange={(e) => setCookie(e.target.value)} type="text" placeholder="Enter cookie here">
      </input>
      {console.log(cookie)}
      <button onClick={() => SaveVoucher100(cookie)}>Save 100 Vouchers</button>
      <button onClick={() => SaveVoucherFS(cookie)}>Save 100 FS</button>
      <button onClick={() => Spc(cookie)}>Test SPC</button>
    </div>
  );
}

export default App;
