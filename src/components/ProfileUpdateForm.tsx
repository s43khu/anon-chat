import { useState, useEffect } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Avatar,
  IconButton,
  Typography,
} from "@mui/material";
import { styled as muiStyled } from "@mui/system";
import CloseIcon from "@mui/icons-material/Close";
import { supabase } from "../lib/supabase-client";

interface ProfileUpdateFormProps {
  user: any; // Replace with appropriate type
  open: boolean;
  onClose: () => void;
}

const DarkDialog = muiStyled(Dialog)(({ theme }) => ({
  "& .MuiPaper-root": {
    backgroundColor: "#1f1f1f",
    color: "#fff",
  },
}));

const DarkTextField = muiStyled(TextField)(({ theme }) => ({
  "& .MuiInputBase-input": {
    color: "#fff",
  },
  "& .MuiInputLabel-root": {
    color: "#bbb",
  },
  "& .MuiOutlinedInput-root": {
    "& fieldset": {
      borderColor: "#555",
    },
    "&:hover fieldset": {
      borderColor: "#888",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#aaa",
    },
  },
}));

const ProfileUpdateForm: React.FC<ProfileUpdateFormProps> = ({
  user,
  open,
  onClose,
}) => {
  const [userName, setUserName] = useState(user.user_metadata.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user.user_metadata.avatar_url);
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUserName(user.user_metadata.name || "");
    setAvatarUrl(user.user_metadata.avatar_url);
  }, [user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    const file = event.target.files[0];
    setNewAvatar(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    let avatarUrlToUpdate = avatarUrl;

    if (newAvatar) {
      const fileExt = newAvatar.name.split(".").pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, newAvatar);

      if (uploadError) {
        alert(uploadError.message);
        setIsLoading(false);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      avatarUrlToUpdate = data?.publicUrl || avatarUrl;
    }

    const updates = {
      user_metadata: {
        name: userName,
        avatar_url: avatarUrlToUpdate,
      },
    };

    const { error } = await supabase.auth.updateUser(updates);

    if (error) {
      alert(error.message);
    } else {
      alert("Profile updated successfully!");
      onClose(); // Close the form after successful update
    }

    setIsLoading(false);
  };

  return (
    <DarkDialog open={open} onClose={onClose}>
      <DialogTitle>
        <Typography variant="h6" component="div">
          Update Profile
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <form onSubmit={handleSubmit}>
          <AvatarContainer>
            <Avatar
              src={avatarUrl}
              alt="Avatar"
              sx={{ width: 100, height: 100 }}
            />
            <input
              accept="image/*"
              style={{ display: "none" }}
              id="avatar-upload"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="avatar-upload">
              <IconButton
                color="primary"
                aria-label="upload picture"
                component="span"
              >
                Upload
              </IconButton>
            </label>
          </AvatarContainer>
          <DarkTextField
            margin="normal"
            label="Username"
            fullWidth
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
          />
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update Profile"}
        </Button>
      </DialogActions>
    </DarkDialog>
  );
};

export default ProfileUpdateForm;

const AvatarContainer = muiStyled("div")({
  display: "flex",
  alignItems: "center",
  gap: "10px",
});
