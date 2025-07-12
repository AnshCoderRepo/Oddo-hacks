import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './AskQuestion.css';

export const AskQuestion = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [inputTag, setInputTag] = useState('');
  const navigate = useNavigate();

  // Rich text editor configuration
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'blockquote', 'code-block', 'list', 'link'
  ];

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && inputTag && tags.length < 5) {
      setTags([...tags, inputTag]);
      setInputTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ 
      title,
      description, // Contains HTML formatted content
      tags 
    });
    navigate('/');
  };

  return (
    <div className="ask-question-container">
      <div className="ask-question-header">
        <h1>Ask a Public Question</h1>
        <p>Share your knowledge with the community.</p>
      </div>

      <form onSubmit={handleSubmit} className="ask-question-form">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <p className="subtext">Be specific and imagine you're asking a question to another person</p>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. How to implement authentication in Node.js?"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <p className="subtext">Include all the information someone would need to answer your question</p>
          <div className="quill-editor-container">
            <ReactQuill
              id="description"
              theme="snow"
              value={description}
              onChange={setDescription}
              modules={modules}
              formats={formats}
              placeholder="Write your question details here..."
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags</label>
          <p className="subtext">Add up to 5 tags to describe what your question is about</p>
          <div className="tags-input-container">
            {tags.map((tag, index) => (
              <span key={index} className="tag">
                {tag}
                <button type="button" onClick={() => removeTag(tag)}>×</button>
              </span>
            ))}
            {tags.length < 5 && (
              <input
                type="text"
                value={inputTag}
                onChange={(e) => setInputTag(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="e.g. (react javascript)"
              />
            )}
          </div>
        </div>

        <button type="submit" className="submit-btn">Post Your Question</button>
      </form>
    </div>
  );
};

export default AskQuestion;