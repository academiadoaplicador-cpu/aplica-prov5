import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Camera, 
  Star, 
  Briefcase, 
  FileCheck, 
  Upload,
  CheckCircle2,
  Save,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { motion } from 'motion/react';
import { databaseService } from '../services/databaseService';
import { ApplicatorProfile, AreaOfExpertise, User as UserType } from '../types';
import { EXPERTISE_OPTIONS, EXPERTISE_ICONS } from '../constants/profile';
import { AddressFields } from './AddressFields';
import { PhoneInput, phoneValueFromStored } from './PhoneInput';
import { buildAddressSummary } from '../types/address';
import { profileToAddress, mergeAddressIntoProfile } from '../utils/profileAddress';
import type { PhoneInputValue } from './PhoneInput';

interface ProfileViewProps {
  user: UserType;
}

export default function ProfileView({ user }: ProfileViewProps) {
  const [profile, setProfile] = useState<ApplicatorProfile>({
    id: user.id,
    fullName: user.businessName || '',
    experienceYears: 1,
    rating: 5,
    phone: '',
    address: '',
    areasOfExpertise: [],
    verifiedDocuments: false,
    documentsUrls: [],
    photoUrl: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [address, setAddress] = useState(() => emptyApplicatorAddressFromProfile());
  const [phone, setPhone] = useState<PhoneInputValue>(() => phoneValueFromStored(''));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  function emptyApplicatorAddressFromProfile() {
    return profileToAddress({
      id: user.id,
      fullName: '',
      experienceYears: 1,
      rating: 5,
      phone: '',
      address: '',
      areasOfExpertise: [],
      verifiedDocuments: false,
      documentsUrls: [],
    });
  }

  useEffect(() => {
    databaseService.getProfile(user.id).then((saved) => {
      if (!saved) return;
      setProfile(saved);
      setAddress(profileToAddress(saved));
      setPhone(
        phoneValueFromStored(saved.phone, saved.phoneCountryCode || '+55'),
      );
    });
  }, [user.id]);

  const handleSave = async () => {
    const payload = mergeAddressIntoProfile(
      {
        ...profile,
        phone: phone.stored,
        phoneCountryCode: phone.countryCode,
        phoneNational: phone.national,
        address: buildAddressSummary(address),
      },
      address,
    );
    setIsSaving(true);
    try {
      await databaseService.setProfile(user.id, payload);
      setProfile(payload);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpertise = (area: AreaOfExpertise) => {
    setProfile(prev => ({
      ...prev,
      areasOfExpertise: prev.areasOfExpertise.includes(area)
        ? prev.areasOfExpertise.filter(a => a !== area)
        : [...prev.areasOfExpertise, area]
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // In a real app, we'd upload to a server/cloud storage
      // For this demo, we'll just simulate by adding their names to the list
      const newDocs = Array.from(files as FileList).map(f => f.name);
      setProfile(prev => ({ 
        ...prev, 
        documentsUrls: [...prev.documentsUrls, ...newDocs],
        verifiedDocuments: true // Simulating verification for demo purposes
      }));
    }
  };

  return (
    <div className="w-full space-y-8 pb-20">
      {/* Header Profile Section */}
      <div className="relative glass rounded-3xl p-8 overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Award size={120} className="text-indigo-500" />
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          {/* Photo Upload */}
          <div className="relative group">
            <div className="w-32 h-32 rounded-2xl bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center relative">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-slate-600" />
              )}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Camera className="text-white" size={24} />
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoUpload} 
            />
            <p className="text-[10px] text-slate-500 text-center mt-2 max-w-[8rem] leading-tight">
              Sua logo aparece nos PDFs dos orçamentos
            </p>
            {profile.verifiedDocuments && (
              <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1 rounded-full border-2 border-slate-900">
                <CheckCircle2 size={16} />
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
              <h2 className="text-2xl font-bold text-white tracking-tight">{profile.fullName || 'Seu Nome Profissional'}</h2>
              <div className="flex items-center justify-center md:justify-start gap-1 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={14} 
                    className={star <= profile.rating ? "text-amber-400 fill-amber-400" : "text-slate-600"} 
                  />
                ))}
              </div>
            </div>

            {profile.verifiedDocuments && profile.areasOfExpertise.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {profile.areasOfExpertise.map(area => (
                  <div 
                    key={area} 
                    className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-2 py-1 rounded-md border border-green-500/20 text-[9px] uppercase font-bold tracking-widest"
                  >
                    {EXPERTISE_ICONS[area]}
                    <span>{area}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
              <Briefcase size={12} className="text-indigo-400" />
              {profile.experienceYears} {profile.experienceYears === 1 ? 'ano' : 'anos'} de experiência comprovada
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info Container */}
        <div className="glass rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <User size={16} />
            Dados Cadastrais
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 mb-2 block font-mono">Nome Completo</label>
              <input 
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ex: João da Silva Envelopamentos"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-2 block font-mono">Telefone (Fixo/Privado)</label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                inputClassName="rounded-lg h-[42px]"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-2 block font-mono">Anos de Profissão</label>
              <input 
                type="number"
                min="0"
                value={profile.experienceYears}
                onChange={(e) => setProfile(prev => ({ ...prev, experienceYears: parseInt(e.target.value) || 0 }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-2 block font-mono">Endereço (Privado)</label>
              <AddressFields
                value={address}
                onChange={setAddress}
                inputClass="rounded-lg h-[42px]"
              />
              <p className="text-[10px] text-slate-600 mt-2 italic">* Telefone e endereço ficam visíveis apenas para a administração da rede.</p>
            </div>
          </div>
        </div>

        {/* Expertise & Skills */}
        <div className="glass rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={16} />
            Áreas de Especialidade
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {EXPERTISE_OPTIONS.map((area) => (
              <button
                key={area}
                onClick={() => toggleExpertise(area)}
                className={`
                  flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200
                  ${profile.areasOfExpertise.includes(area)
                    ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-200' 
                    : 'bg-slate-950/50 border-slate-800 text-slate-500 opacity-60 hover:opacity-100 hover:border-slate-700'
                  }
                `}
              >
                <div className={`
                  w-5 h-5 rounded-md flex items-center justify-center transition-colors
                  ${profile.areasOfExpertise.includes(area) ? 'bg-indigo-500 text-white' : 'border-2 border-slate-800'}
                `}>
                  {profile.areasOfExpertise.includes(area) && <CheckCircle2 size={12} />}
                </div>
                <span className="text-sm font-medium">{area}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Document Upload Section */}
      <div className="glass rounded-2xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <FileCheck size={16} />
            Documentação Comprobatória
          </h3>
          {profile.verifiedDocuments && (
            <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-full font-mono uppercase">
              <CheckCircle2 size={10} /> Verificado
            </span>
          )}
        </div>

        <div 
          onClick={() => docInputRef.current?.click()}
          className="border-2 border-dashed border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 hover:border-indigo-500/50 hover:bg-slate-900/30 transition-all cursor-pointer group"
        >
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="text-indigo-400" size={28} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-300">Upload de Documentos</p>
            <p className="text-xs text-slate-500 mt-1">PDF, JPG ou PNG (Máx 10MB)</p>
          </div>
          <input 
            type="file" 
            ref={docInputRef} 
            className="hidden" 
            multiple 
            onChange={handleDocUpload} 
          />
        </div>

        {profile.documentsUrls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile.documentsUrls.map((doc, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 font-mono">
                <FileCheck size={14} className="text-indigo-500" />
                <span className="truncate flex-1">{doc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Save Button */}
      <div className="flex justify-end pt-4 pb-12">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`
            flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shadow-xl
            ${isSaving 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]'
            }
          `}
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={20} />
          )}
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {/* Success Notification */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={showSuccess ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        className="fixed bottom-8 right-8 z-[100]"
      >
        <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold border border-green-400">
          <CheckCircle2 size={24} />
          Perfil atualizado com sucesso!
        </div>
      </motion.div>
    </div>
  );
}
