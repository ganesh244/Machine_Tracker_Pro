import React, { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './password-input.css';

export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
 const [visible, setVisible] = useState(false);
 const label = visible ? 'Hide password' : 'Show password';
 return <span className="fo-password-input"><input {...props} type={visible ? 'text' : 'password'}/><button type="button" className="fo-password-toggle" aria-label={label} aria-pressed={visible} title={label} disabled={props.disabled} onClick={()=>setVisible(value=>!value)}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button></span>;
}
