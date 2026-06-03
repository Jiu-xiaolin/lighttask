import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Icon } from "../lib/icons";

export function Profile({ user: initialUser, theme, api: _api, refresh, setUser: setAppUser }: any) {
  const [name, setName] = useState(initialUser.name || "");
  const [avatar, setAvatar] = useState(initialUser.avatar || "");
  const [signature, setSignature] = useState(initialUser.signature || "把复杂协作变成可推进的小步。");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editingSig, setEditingSig] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLTextAreaElement>(null);
  const isImageAvatar = avatar && (avatar.startsWith("/uploads/") || avatar.startsWith("http"));

  function flash(text: string, ok: boolean) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 2500); }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { flash("图片不超过 2MB", false); return; }
    setUploading(true);
    try {
      const form = new FormData(); form.append("file", file);
      const token = localStorage.getItem("lt_token") || "";
      const res = await fetch("/api/profile/avatar", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "上传失败"); }
      const data = await res.json();
      setAvatar(data.url);
      flash("头像已更新", true);
    } catch (e: any) { flash(e.message || "上传失败", false); }
    finally { setUploading(false); }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await api("/profile", { method: "PATCH", body: JSON.stringify({ name, signature, avatar }) });
      const updated = { ...initialUser, name, avatar, signature };
      setAppUser(updated);
      localStorage.setItem("lt_user", JSON.stringify(updated));
      flash("资料已保存", true);
    } catch (e: any) { flash(e.message || "保存失败", false); }
    finally { setSaving(false); }
  }

  async function handleChangePassword() {
    if (!currentPw) return flash("请输入当前密码", false);
    if (!newPw || newPw.length < 6) return flash("新密码至少 6 位", false);
    if (newPw !== confirmPw) return flash("两次新密码不一致", false);
    try {
      await api("/profile/password", { method: "PATCH", body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }) });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      flash("密码已修改", true);
    } catch (e: any) { flash(e.message || "密码修改失败", false); }
  }

  function startEditName() { setEditingName(true); setTimeout(() => nameRef.current?.focus(), 50); }
  function startEditSig() { setEditingSig(true); setTimeout(() => sigRef.current?.focus(), 50); }
  function commitName() { setEditingName(false); }
  function commitSig() { setEditingSig(false); }

  return <div className="profile-page">
    {msg && <div className={`toast-fixed ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
    <section className="profile-main">
      <div className="panel-head">
        <div><h2>用户信息设置</h2><p>头像、卡片背景、个性签名和密码在这里集中维护。</p></div>
        <button className="btn primary" onClick={handleSaveProfile} disabled={saving}><Icon name="save" />{saving ? "保存中..." : "保存设置"}</button>
      </div>
      <div className="profile-editor">
        <section className={`profile-id-card card-theme-${theme}`}>
          <div className="profile-id-left">
            <div className="avatar-square" onClick={() => fileRef.current?.click()}>
              {isImageAvatar ? <img src={avatar} alt="" /> : <span className="avatar-text">{name?.[0] || initialUser.name?.[0]}</span>}
              <div className="avatar-overlay">{uploading ? "..." : "更换头像"}</div>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleAvatarUpload} style={{display:"none"}} />
            <div className="profile-id-meta">
              {editingName ? <input ref={nameRef} className="inline-edit" value={name} onChange={e => setName(e.target.value)} onBlur={commitName} onKeyDown={e => { if (e.key === "Enter") commitName(); }} placeholder="姓名" /> :
                <div className="editable-row"><strong className="preview-name">{name || initialUser.name}</strong><button className="pencil-btn" onClick={startEditName}><Icon name="edit" /></button></div>}
              <em>@{initialUser.username}</em>
              <span className={`role-tag ${initialUser.role === "SUPER_ADMIN" ? "admin" : "member"}`}>{initialUser.role === "SUPER_ADMIN" ? "超级管理员" : "项目成员"}</span>
              {editingSig ? <textarea ref={sigRef} className="inline-edit sig" value={signature} onChange={e => setSignature(e.target.value)} onBlur={commitSig} rows={2} maxLength={60} placeholder="个性签名" /> :
                <div className="editable-row"><p>{signature || "把复杂协作变成可推进的小步。"}</p><button className="pencil-btn" onClick={startEditSig}><Icon name="edit" /></button></div>}
              {editingSig && <span className="char-count">{signature.length}/60</span>}
            </div>
          </div>
        </section>
        <section className="form-card">
          <div className="form-card-head"><strong>修改密码</strong></div>
          <div className="password-form">
            <div className="password-row">
              <label>当前密码<input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="输入当前密码" /></label>
              <label>新密码<input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="至少 6 位" /></label>
              <label>确认新密码<input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="再次输入新密码" /></label>
            </div>
            <button className="btn primary" onClick={handleChangePassword}>修改密码</button>
          </div>
        </section>
      </div>
    </section>
  </div>;
}
