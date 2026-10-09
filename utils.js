export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const normalizeText = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
export const number = value => Number.isFinite(Number(value)) && value !== null && value !== '' ? new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(Number(value)) : '—';
export function date(value, time = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',...(time ? {hour:'2-digit',minute:'2-digit'} : {}),timeZone:'Asia/Ho_Chi_Minh'}).format(d);
}
export const isUUID = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');
export const statusLabel = status => ({published:'Đã phát hành',draft:'Bản nháp',archived:'Đã lưu trữ',active:'Hoạt động',pending:'Chờ kích hoạt',locked:'Đã khóa',revoked:'Đã thu hồi'}[status] || 'Không xác định');
export function profileIssue(profile) {
  if (!profile) return 'Chưa tìm thấy hồ sơ tài khoản. Vui lòng liên hệ quản trị viên.';
  if (profile.status !== 'active') return ({pending:'Tài khoản đang chờ quản trị viên kích hoạt.',locked:'Tài khoản của bạn đã bị khóa.',revoked:'Quyền truy cập của tài khoản đã được thu hồi.'}[profile.status] || 'Tài khoản chưa được phép truy cập.');
  if (profile.expires_at && new Date(profile.expires_at).getTime() <= Date.now()) return 'Thời hạn truy cập của tài khoản đã kết thúc.';
  return null;
}
export function csvCell(value) {
  let s = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"','""') + '"';
}
export const toCSV = rows => '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
export function tableHTML(rows, columns) {
  if (!Array.isArray(rows) || !rows.length) return '<p class="muted">Chưa có dữ liệu trong bảng này.</p>';
  if (!Array.isArray(columns) || !columns.length) return '<p class="muted">Bảng chưa được cấu hình cột.</p>';
  const cols = columns.slice(0,20).filter(c => c && typeof c.key === 'string');
  return `<div class="table-scroll"><table><thead><tr>${cols.map(c=>`<th scope="col" class="${c.format==='number'?'numeric':''}">${escapeHTML(c.label || c.key)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,1000).map(row=>`<tr>${cols.map(c=>`<td class="${c.format==='number'?'numeric':''}">${escapeHTML(c.format==='number'?number(row?.[c.key]):typeof row?.[c.key]==='object'?JSON.stringify(row[c.key]):row?.[c.key] ?? '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${rows.length>1000?'<p class="section-source">Đang hiển thị 1.000 dòng đầu tiên.</p>':''}`;
}
export function chartHTML(rows, config) {
  const points = (Array.isArray(rows) ? rows : []).slice(0,60).filter(r=>r && r[config.y_key] !== null && r[config.y_key] !== '' && Number.isFinite(Number(r[config.y_key]))).map(r=>({label:String(r[config.x_key] ?? ''),value:Number(r[config.y_key])}));
  if (!points.length) return '<p class="muted">Chưa có dữ liệu hợp lệ cho biểu đồ này.</p>';
  const W=680,H=300,left=65,right=15,top=25,bottom=48,plotW=W-left-right,plotH=H-top-bottom;
  const rawMax=Math.max(0,...points.map(p=>p.value)),rawMin=Math.min(0,...points.map(p=>p.value));
  const span=rawMax-rawMin || 1, roughStep=span/5, magnitude=10**Math.floor(Math.log10(roughStep));
  const step=([1,2,2.5,5,10].find(v=>v*magnitude>=roughStep)||10)*magnitude;
  const max=Math.ceil(rawMax/step)*step || step, min=rawMin<0?Math.floor(rawMin/step)*step:0;
  const y = v => top+(max-v)/(max-min)*plotH;
  const x = i => left+(i+.5)*plotW/points.length;
  const baseline = y(0);
  const ticks = Array.from({length:Math.round((max-min)/step)+1},(_,i)=>min+step*i);
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHTML(config.title || 'Biểu đồ số liệu')}"><title>${escapeHTML(config.title || 'Biểu đồ số liệu')}</title>`;
  svg += ticks.map(t=>`<line class="chart-grid" x1="${left}" x2="${W-right}" y1="${y(t)}" y2="${y(t)}"/><text x="${left-12}" y="${y(t)+4}" text-anchor="end">${escapeHTML(number(Math.round(t*100)/100))}</text>`).join('');
  if (config.type==='line') {
    const path=points.map((p,i)=>`${i?'L':'M'}${x(i)},${y(p.value)}`).join(' ');
    svg+=`<path class="chart-area" d="${path} L${x(points.length-1)},${baseline} L${x(0)},${baseline} Z"/><path class="chart-stroke" d="${path}"/>`;
    svg+=points.map((p,i)=>`<circle class="chart-point" cx="${x(i)}" cy="${y(p.value)}" r="4"><title>${escapeHTML(p.label)}: ${escapeHTML(number(p.value))}</title></circle>`).join('');
  } else {
    const width=Math.min(52,plotW/points.length*.55);
    svg+=points.map((p,i)=>`<rect class="chart-bar" x="${x(i)-width/2}" y="${Math.min(y(p.value),baseline)}" width="${width}" height="${Math.max(Math.abs(baseline-y(p.value)),1)}" rx="3"><title>${escapeHTML(p.label)}: ${escapeHTML(number(p.value))}</title></rect>`).join('');
  }
  const stride=Math.max(1,Math.ceil(points.length/10));
  svg+=points.filter((_,i)=>i%stride===0).map((p,i)=>`<text x="${x(i*stride)}" y="${H-20}" text-anchor="middle">${escapeHTML(p.label.length>13?p.label.slice(0,12)+'…':p.label)}</text>`).join('')+'</svg>';
  const accessible=points.map(p=>`${p.label}: ${number(p.value)}`).join('; ');
  return `<div class="chart-unit">${escapeHTML(config.unit ? 'Đơn vị: '+config.unit : '')}</div>${svg}<details class="chart-details"><summary>Xem số liệu biểu đồ</summary><p class="body-text">${escapeHTML(accessible)}</p></details>`;
}
